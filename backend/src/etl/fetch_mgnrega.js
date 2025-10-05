/**
 * ETL template: fetch data from data.gov.in MGNREGA endpoint and store snapshots in MongoDB.
 * Adjust query parameters to the actual dataset fields.
 */
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'gramdarpan';
const DATA_GOV_BASE = process.env.DATA_GOV_BASE || 'https://api.data.gov.in/resource';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, attempts = 3, backoff = 1000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await axios.get(url, { timeout: 20000 });
    } catch (err) {
      lastErr = err;
      const wait = backoff * Math.pow(2, i);
      console.warn(`Fetch attempt ${i+1} failed, retrying in ${wait}ms:`, err.message || err);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function fetchAndStore(state = 'Madhya Pradesh') {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  // Create an ETL run record to track status
  const etlRun = { state, started_at: new Date(), status: 'running', total_fetched: 0 };
  const etlRunRes = await db.collection('etl_runs').insertOne(etlRun);
  const etlRunId = etlRunRes.insertedId;
  let totalFetched = 0;
  try {
    // Use the district-wise MGNREGA resource described by the user
    const resourceId = 'ee03643a-ee4c-48c2-ac30-9f2ff26ab722';
    const apiKey = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

    // Pagination: fetch in pages using offset/limit
    const limit = 100; // server may return fewer depending on key; sample key returns 10
    let offset = 0;
    let totalFetched = 0;

    while (true) {
      const stateFilter = encodeURIComponent(String(state).toUpperCase());
      const url = `${DATA_GOV_BASE}/${resourceId}?format=json&filters[state_name]=${stateFilter}&limit=${limit}&offset=${offset}&api-key=${apiKey}`;
      console.log('Fetching', url);
      const resp = await fetchWithRetry(url, 4, 1000);
      const body = resp.data || {};

      // Fallback: if no records and this was probably due to state name casing, try without uppercasing once
      if ((!body.records || body.records.length === 0) && offset === 0) {
        console.log('No records returned for uppercase state filter; trying original state casing as fallback')
        const url2 = `${DATA_GOV_BASE}/${resourceId}?format=json&filters[state_name]=${encodeURIComponent(state)}&limit=${limit}&offset=${offset}&api-key=${apiKey}`;
        console.log('Fetching fallback', url2);
        const resp2 = await fetchWithRetry(url2, 3, 1000);
        const body2 = resp2.data || {};
        if (body2.records && body2.records.length) {
          console.log('Fallback fetch returned records')
          body.records = body2.records
        }
      }

      // Store snapshot per page
      await db.collection('snapshots').insertOne({ fetched_at: new Date(), state, offset, limit, raw: body });

      const records = body.records || [];
      if (!records.length) break;

      // Helper to extract field by possible names
      const getField = (obj, candidates) => {
        for (const c of candidates) if (obj[c] !== undefined) return obj[c];
        // try case-insensitive key match
        const keys = Object.keys(obj);
        for (const k of keys) {
          for (const c of candidates) {
            if (k.toLowerCase() === c.toLowerCase()) return obj[k];
          }
        }
        return undefined;
      };

      for (const r of records) {
        const rawDistrict = getField(r, ['district_name', 'district', 'districtName']) || '';
        const districtId = String(rawDistrict).trim().toLowerCase().replace(/\s+/g, '_') || 'unknown';
        const districtName = String(rawDistrict).trim() || 'Unknown';
        const finYear = getField(r, ['fin_year', 'financial_year', 'finyear']) || getField(r, ['finYear']) || null;
        // month can be provided as 'month' or 'reporting_month' or 'month_name'
        const monthRaw = getField(r, ['month', 'reporting_month', 'reportingMonth', 'month_name']) || null;
        // beneficiaries field variants
        const beneficiariesRaw = getField(r, ['beneficiaries', 'no_of_beneficiaries', 'no_of_beneficiary']) || 0;
        const daysWorkedRaw = getField(r, ['days_worked', 'daysworked', 'no_of_persondays']) || 0;

        // Normalize month into yyyy-mm when possible; otherwise keep raw
        let month = monthRaw || finYear || 'unknown';
        if (typeof month === 'string') month = month.trim();

        const beneficiaries = Number(beneficiariesRaw) || 0;
        const days_worked = Number(daysWorkedRaw) || 0;

        // Upsert district
        await db.collection('districts').updateOne(
          { id: districtId },
          { $set: { id: districtId, name: districtName, state } },
          { upsert: true }
        );

        // Upsert per-district-month document to avoid duplicates
        await db.collection('district_monthly').updateOne(
          { district_id: districtId, month },
          {
            $set: {
              district_id: districtId,
              name: districtName,
              state,
              month,
              fin_year: finYear,
              beneficiaries,
              days_worked,
              raw: r,
            },
          },
          { upsert: true }
        );
      }

  totalFetched += records.length;
  console.log(`Fetched ${records.length} records (offset ${offset}). Total fetched: ${totalFetched}`);
      // If fewer than limit returned, we are done
      if (records.length < limit) break;
      offset += limit;
    }
    // update run as success
    await db.collection('etl_runs').updateOne({ _id: etlRunId }, { $set: { status: 'success', finished_at: new Date(), total_fetched: totalFetched } });
    return { ok: true, total_fetched: totalFetched, run_id: etlRunId };
  } catch (err) {
    console.error('ETL error:', err);
    await db.collection('etl_runs').updateOne({ _id: etlRunId }, { $set: { status: 'failed', finished_at: new Date(), error: String(err), total_fetched: totalFetched } });
    throw err;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const stateArg = process.argv[2] || 'Madhya Pradesh';
  fetchAndStore(stateArg).catch(err => console.error(err));
}

module.exports = { fetchAndStore };
