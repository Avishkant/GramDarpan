/**
 * Precompute district-level reports from district_monthly collection.
 * The script writes one document per district into `district_reports`.
 * It is idempotent and safe to run repeatedly (overwrites existing reports).
 * Use as admin cron (e.g., daily) to avoid hitting data.gov.in at read time.
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'GramDarpan';

if (!MONGO_URL) {
  console.error('MONGO_URL missing');
  process.exit(1);
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v.replace(/[,\s]/g, '')) || 0;
  return 0;
}

async function main() {
  const client = new MongoClient(MONGO_URL, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  // get list of districts
  const districts = await db.collection('districts').find().toArray();
  console.log('Found districts:', districts.length);

  for (const d of districts) {
    const districtKey = d.id || d._id;
    const rows = await db.collection('district_monthly').find({ district_id: districtKey }).toArray();
    if (!rows || rows.length === 0) continue;

    // assemble timeseries sorted by a simple month ordering; we keep the original month labels
    const timeseries = rows.map(r => ({ month: r.month, beneficiaries: toNumber(r.beneficiaries), days_worked: toNumber(r.days_worked) }))
      .sort((a, b) => (a.month > b.month ? 1 : a.month < b.month ? -1 : 0));

    const total_beneficiaries = timeseries.reduce((s, t) => s + (t.beneficiaries || 0), 0);
    const latest = timeseries[timeseries.length - 1] || { beneficiaries: 0 };

    // compute a simple trend category for quick comprehension
    const latestN = latest.beneficiaries || 0;
    const trend = latestN > 50000 ? 'high' : latestN > 20000 ? 'medium' : 'low';

    const report = {
      district_id: districtKey,
      name: d.name,
      state: d.state,
      updated_at: new Date(),
      summary: {
        total_beneficiaries,
        latest_month: latest.month || null,
        latest_beneficiaries: latestN,
        trend
      },
      timeseries // keep raw timeseries for charts
    };

    await db.collection('district_reports').updateOne({ district_id: d._id }, { $set: report }, { upsert: true });
    console.log('Wrote report for', d._id);
  }

  await client.close();
  console.log('Done precompute');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
