const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const config = require('../config');

// Middleware to check admin token
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== config.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

router.post('/run-etl', requireAdminToken, async (req, res) => {
  try {
    const state = req.body.state || 'Madhya Pradesh';
    // Lazy-require ETL so importing the module doesn't execute anything accidentally
    const { fetchAndStore } = require('../etl/fetch_mgnrega');
    
    // Run ETL asynchronously
    fetchAndStore(state)
      .then(() => console.log('ETL run completed'))
      .catch(err => console.error('ETL run failed', err));
    
    res.json({ ok: true, message: 'ETL started' });
  } catch (error) {
    console.error('Error starting ETL:', error);
    res.status(500).json({ error: 'Failed to start ETL' });
  }
});

router.get('/etl-status', requireAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const runs = await db.collection('etl_runs').find().sort({ started_at: -1 }).limit(20).toArray();
    res.json(runs);
  } catch (error) {
    console.error('Error fetching ETL status:', error);
    res.status(500).json({ error: 'Failed to fetch ETL status' });
  }
});

module.exports = router;
