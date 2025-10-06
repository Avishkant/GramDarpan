const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const config = require('../config');

// Simple in-memory cache as fallback; when Redis is configured, index.js attaches redisClient to req
const inMemoryReportCache = new Map()
const REPORT_CACHE_TTL = 1000 * 60 * 30 // 30 minutes

async function getCachedReport(req, key) {
  const redis = req.redisClient
  if (redis) {
    try {
      const v = await redis.get(`report:${key}`)
      if (v) return JSON.parse(v)
    } catch (e) { /* fallthrough to in-memory */ }
  }
  const mem = inMemoryReportCache.get(key)
  if (mem && (Date.now() - mem.ts) < REPORT_CACHE_TTL) return mem.data
  return null
}

async function setCachedReport(req, key, value) {
  const redis = req.redisClient
  if (redis) {
    try {
      await redis.set(`report:${key}`, JSON.stringify(value), 'EX', Math.floor(REPORT_CACHE_TTL/1000))
    } catch (e) { /* ignore */ }
  }
  inMemoryReportCache.set(key, { ts: Date.now(), data: value })
}

// Public endpoint to fetch a precomputed report for a district
router.get('/:id/report', async (req, res) => {
  const id = req.params.id;
  const db = getDb();
  const cacheKey = id
  try {
    const cached = await getCachedReport(req, cacheKey)
    if (cached) return res.json(cached)
  } catch (e) { /* continue to DB */ }
  // try direct id match first
  let rpt = await db.collection('district_reports').findOne({ district_id: id });
  if (!rpt) {
    // try matching by ObjectId string (some reports were written with _id values)
    try {
      const { ObjectId } = require('mongodb');
      if (ObjectId.isValid(id)) {
        rpt = await db.collection('district_reports').findOne({ district_id: ObjectId(id) });
      }
    } catch (e) {
      // ignore
    }
  }
  if (!rpt) {
    // try matching on name (case-insensitive)
    rpt = await db.collection('district_reports').findOne({ name: { $regex: `^${id}$`, $options: 'i' } });
  }
  if (!rpt) return res.status(404).json({ error: 'report_not_found' });
  // cache and return
  try { await setCachedReport(req, cacheKey, rpt) } catch(e){}
  res.json(rpt);
});

// Admin endpoint to force recompute (protected by ADMIN_TOKEN via header x-admin-token)
router.post('/admin/recompute', async (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== config.ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  // Spawn the precompute script in background (non-blocking)
  try {
    const { spawn } = require('child_process');
    const script = require('path').join(__dirname, '..', '..', 'scripts', 'precompute_reports.js');
    const child = spawn(process.execPath, [script], { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ ok: true, message: 'recompute_started' });
  } catch (err) {
    console.error('Failed to start precompute', err);
    res.status(500).json({ error: 'failed_to_start' });
  }
});

module.exports = router;
