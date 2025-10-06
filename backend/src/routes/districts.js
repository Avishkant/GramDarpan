const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
  // Debugging: log incoming request info so we can trace client vs node requests
  try {
    const origin = req.get('origin') || req.get('referer') || ''
    console.info('[districts] request from', req.ip || req.connection.remoteAddress, 'origin:', origin, 'host header:', req.get('host'))
    // Optionally log a few headers when debugging
    // console.debug('[districts] headers:', { origin: req.get('origin'), referer: req.get('referer'), host: req.get('host'), ua: req.get('user-agent') })
  } catch (e) { /* ignore logging errors */ }
  const db = getDb();
  // support different state value cases written by ETL
  const districts = await db.collection('districts').find({ state: { $in: ['MP','Madhya Pradesh','Madhya pradesh','Madhya Pradesh'.toUpperCase()] } }).toArray();
  // normalize name casing to Title Case for frontend
  const normalize = s => String(s).toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
  res.json(districts.map(d => ({ id: d.id, name: normalize(d.name) })));
});

module.exports = router;
