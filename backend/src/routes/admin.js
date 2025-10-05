const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const config = require('../config');

function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== config.ADMIN_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

router.post('/run-etl', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const state = req.body.state || 'Madhya Pradesh';
  const { fetchAndStore } = require('../etl/fetch_mgnrega');
  fetchAndStore(state).then(() => console.log('ETL run completed')).catch(err => console.error('ETL run failed', err));
  res.json({ ok: true, message: 'ETL started' });
});

router.get('/etl-status', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = getDb();
  const runs = await db.collection('etl_runs').find().sort({ started_at: -1 }).limit(20).toArray();
  res.json(runs);
});

module.exports = router;
