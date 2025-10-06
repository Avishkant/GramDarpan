/*
  One-off utility to recompute numeric normalized fields in district_monthly
  from the stored `raw` object. Run this locally in dev to fix seeded data.

  Usage (PowerShell):
    node scripts/recompute_district_monthly_from_raw.js

  It will update documents in-place: set .beneficiaries and .days_worked
  derived from common field names found in the raw payload. It will log a
  small sample of changed docs.
*/

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'GramDarpan';

if (!MONGO_URL) {
  console.error('MONGO_URL missing in .env');
  process.exit(1);
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // remove commas, spaces
    const cleaned = v.replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getField(raw, candidates) {
  if (!raw) return undefined;
  for (const k of candidates) {
    if (k in raw) return raw[k];
    const lower = k.toLowerCase();
    for (const rk of Object.keys(raw)) {
      if (rk.toLowerCase() === lower) return raw[rk];
    }
  }
  return undefined;
}

async function main() {
  const client = new MongoClient(MONGO_URL, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);
  const coll = db.collection('district_monthly');

  const cursor = coll.find({});
  let updated = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const raw = doc.raw || {};
    const beneficiariesRaw = getField(raw, ['Total_Individuals_Worked', 'Total_No_of_Workers', 'Total_No_of_Active_Workers', 'Total_No_of_Workers', 'no_of_beneficiaries', 'beneficiaries']) || 0;
    const daysWorkedRaw = getField(raw, ['Average_days_of_employment_provided_per_Household', 'Average_days_of_employment_provided_per_household', 'days_worked', 'no_of_persondays', 'daysworked']) || 0;

    const beneficiaries = toNumber(beneficiariesRaw);
    const days_worked = toNumber(daysWorkedRaw);

    const set = {};
    if (doc.beneficiaries !== beneficiaries) set.beneficiaries = beneficiaries;
    if (doc.days_worked !== days_worked) set.days_worked = days_worked;

    if (Object.keys(set).length > 0) {
      await coll.updateOne({ _id: doc._id }, { $set: set });
      updated++;
      if (updated <= 10) {
        console.log('Updated doc', doc._id.toString(), 'set', set);
      }
    }
  }

  console.log('Done. Documents updated:', updated);
  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
