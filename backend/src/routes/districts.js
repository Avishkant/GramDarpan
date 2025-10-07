const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Simple in-memory cache for districts to avoid hitting DB on every request.
// TTL is short because districts rarely change but we want reasonably fresh data.
const DISTRICTS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
router.get('/', async (req, res) => {
  // Debugging: log incoming request info so we can trace client vs node requests
  try {
    const origin = req.get('origin') || req.get('referer') || ''
    console.info('[districts] request from', req.ip || req.connection.remoteAddress, 'origin:', origin, 'host header:', req.get('host'))
    // Optionally log a few headers when debugging
    // console.debug('[districts] headers:', { origin: req.get('origin'), referer: req.get('referer'), host: req.get('host'), ua: req.get('user-agent') })
  } catch (e) { /* ignore logging errors */ }
  const db = getDb();

  // Check in-memory cache first
  try {
    const cache = req.app && req.app.locals && req.app.locals._districtsCache
    if (cache && (Date.now() - cache.ts) < DISTRICTS_CACHE_TTL) {
      // Serve cached result
      console.info('[districts] served from cache')
      return res.json(cache.data)
    }
  } catch (e) {
    // ignore cache errors and fall back to DB
  }

  // support different state value cases written by ETL
  // only request the fields we need (projection) to reduce wire and parsing cost
  const cursor = db.collection('districts').find(
    { state: { $in: ['MP','Madhya Pradesh','Madhya pradesh','Madhya Pradesh'.toUpperCase()] } },
    { projection: { id: 1, name: 1, _id: 0 } }
  )
  const districts = await cursor.toArray();
  // normalize name casing to Title Case for frontend
  const normalize = s => String(s).toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
  const payload = districts.map(d => ({ id: d.id, name: normalize(d.name) }));

  // store in in-memory cache on the app object for reuse
  try {
    if (req.app && req.app.locals) {
      req.app.locals._districtsCache = { ts: Date.now(), data: payload }
    }
  } catch (e) {
    // ignore cache set errors
  }

  res.json(payload);
});

module.exports = router;
