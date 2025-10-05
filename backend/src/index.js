const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'gramdarpan';
let db;

async function start() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db(dbName);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/districts', async (req, res) => {
    const districts = await db.collection('districts').find({ state: 'MP' }).toArray();
    res.json(districts.map(d => ({ id: d.id, name: d.name })));
  });

  app.get('/api/district/:id/metrics', async (req, res) => {
    const id = req.params.id;
    // Fetch monthly records for this district
    const rows = await db.collection('district_monthly').find({ district_id: id }).toArray();
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'not found' });

    // Build timeseries sorted by month (lexicographic sort is OK if months are yyyy-mm)
    const timeseries = rows
      .map(r => ({ month: r.month, beneficiaries: r.beneficiaries || 0, days_worked: r.days_worked || 0 }))
      .sort((a, b) => (a.month > b.month ? 1 : a.month < b.month ? -1 : 0));

    // Compute simple state percentile: rank of latest beneficiaries among all districts
    const latestMonth = timeseries[timeseries.length - 1].month;
    const latestBeneficiaries = timeseries[timeseries.length - 1].beneficiaries;

    // Get latest beneficiaries for all districts at the same month
    const pipeline = [
      { $match: { month: latestMonth } },
      { $group: { _id: '$district_id', beneficiaries: { $first: '$beneficiaries' } } },
      { $sort: { beneficiaries: -1 } }
    ];
    const allLatest = await db.collection('district_monthly').aggregate(pipeline).toArray();
    const rank = allLatest.findIndex(d => d._id === id) + 1;
    const percentile = allLatest.length ? Math.round(((allLatest.length - rank) / allLatest.length) * 100) : 0;

    res.json({ district_id: id, name: rows[0].name, timeseries, comparison: { state_percentile: percentile, latest_month: latestMonth, latest_beneficiaries: latestBeneficiaries } });
  });

  // Admin routes
  app.post('/api/admin/run-etl', async (req, res) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (!token || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const state = req.body.state || 'Madhya Pradesh';
    // Lazy-require ETL so importing the module doesn't execute anything accidentally
    const { fetchAndStore } = require('./etl/fetch_mgnrega');
    fetchAndStore(state).then(() => console.log('ETL run completed')).catch(err => console.error('ETL run failed', err));
    res.json({ ok: true, message: 'ETL started' });
  });

  // Optional: run ETL on startup if explicitly enabled
  if (process.env.START_ETL_ON_BOOT === 'true') {
    console.log('START_ETL_ON_BOOT is true — running ETL once at startup');
    const { fetchAndStore } = require('./etl/fetch_mgnrega');
    fetchAndStore('Madhya Pradesh').then(() => console.log('Startup ETL completed')).catch(err => console.error('Startup ETL failed', err));
  }

  app.get('/api/admin/etl-status', async (req, res) => {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (!token || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
    const runs = await db.collection('etl_runs').find().sort({ started_at: -1 }).limit(20).toArray();
    res.json(runs);
  });

  // Auto-detect district using request IP and reverse geocoding.
  app.get('/api/geo/auto', async (req, res) => {
    try {
      // Determine client IP (supporting common headers)
      const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress;
      // Use ip-api.com for quick IP geolocation (no key, limited rate). Returns lat/lon and region data.
      const ipResp = await fetch(`http://ip-api.com/json/${ip}`);
      const ipJson = await ipResp.json();
      if (!ipJson || ipJson.status !== 'success') return res.json({ ok: false, reason: 'ip-lookup-failed' });

      const { lat, lon } = { lat: ipJson.lat, lon: ipJson.lon };

      // Reverse geocode using Nominatim
      const ua = encodeURIComponent(process.env.NOMINATIM_USER_AGENT || 'gramdarpan');
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`; 
      const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } });
      const nomJson = await nomResp.json();

      // Try to extract district name from nominatim (village/town/county/state_district)
      const candidates = [nomJson.address.district, nomJson.address.county, nomJson.address.city, nomJson.address.town, nomJson.address.village];
      const cleaned = candidates.filter(Boolean).map(s => String(s).trim());

      // Try matching by name against districts collection
      for (const name of cleaned) {
        const hit = await db.collection('districts').findOne({ name: { $regex: `^${name}$`, $options: 'i' }, state: 'MP' });
        if (hit) return res.json({ ok: true, method: 'nominatim', district: { id: hit.id, name: hit.name }, lat, lon });
      }

      // Fallback: return lat/lon so client can ask user to confirm
      res.json({ ok: true, method: 'ip', lat, lon, note: 'no exact district match found' });
    } catch (err) {
      console.error('geo auto error', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('Backend running on', port));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
