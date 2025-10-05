const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/auto', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress;
    const ipResp = await fetch(`http://ip-api.com/json/${ip}`);
    const ipJson = await ipResp.json();
    if (!ipJson || ipJson.status !== 'success') return res.json({ ok: false, reason: 'ip-lookup-failed' });
    const { lat, lon } = { lat: ipJson.lat, lon: ipJson.lon };
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`;
    const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } });
    const nomJson = await nomResp.json();
    const candidates = [nomJson.address?.district, nomJson.address?.county, nomJson.address?.city, nomJson.address?.town, nomJson.address?.village].filter(Boolean).map(s => String(s).trim());
    const db = getDb();
    for (const name of candidates) {
      const hit = await db.collection('districts').findOne({ name: { $regex: `^${name}$`, $options: 'i' }, state: 'MP' });
      if (hit) return res.json({ ok: true, method: 'nominatim', district: { id: hit.id, name: hit.name }, lat, lon });
    }
    res.json({ ok: true, method: 'ip', lat, lon, note: 'no exact district match found' });
  } catch (err) {
    console.error('geo auto error', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.body || {}
    if (!lat || !lon) return res.status(400).json({ ok: false, error: 'lat/lon required' })
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`;
    console.log('geo.reverse request', { lat, lon })
    const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } });
    const nomJson = await nomResp.json();
    const candidates = [nomJson.address?.district, nomJson.address?.county, nomJson.address?.city, nomJson.address?.town, nomJson.address?.village].filter(Boolean).map(s => String(s).trim());
    console.log('geo.reverse nominatim address candidates', candidates)
    const db = getDb();
    // Try exact matches first
    const districts = await db.collection('districts').find({ state: { $exists: true } }).toArray();
    const normalize = s => String(s||'').toLowerCase().replace(/\b(district|zilla|zila|districts)\b/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()

    const normDistricts = districts.map(d => ({ ...d, _norm: normalize(d.name) }))
    // exact match against candidates
    for (const name of candidates) {
      const n = normalize(name)
      const hit = normDistricts.find(d => d._norm === n)
      if (hit) {
        console.log('geo.reverse exact match', hit.name)
        return res.json({ ok: true, method: 'nominatim-exact', district: { id: hit.id, name: hit.name }, lat, lon });
      }
    }

    // startsWith / includes
    for (const name of candidates) {
      const n = normalize(name)
      const hit = normDistricts.find(d => d._norm.startsWith(n) || d._norm.includes(n))
      if (hit) {
        console.log('geo.reverse includes match', hit.name)
        return res.json({ ok: true, method: 'nominatim-include', district: { id: hit.id, name: hit.name }, lat, lon, candidate: name });
      }
    }

    // fallback: simple Levenshtein distance
    const levenshtein = (a,b) => {
      const m = a.length, n = b.length
      const dp = Array.from({length:m+1},()=>Array(n+1).fill(0))
      for(let i=0;i<=m;i++) dp[i][0]=i
      for(let j=0;j<=n;j++) dp[0][j]=j
      for(let i=1;i<=m;i++){
        for(let j=1;j<=n;j++){
          const cost = a[i-1]===b[j-1]?0:1
          dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)
        }
      }
      return dp[m][n]
    }

    let best = null
    for (const name of candidates) {
      const n = normalize(name)
      for (const d of normDistricts) {
        const dist = levenshtein(n, d._norm)
        const thresh = Math.max(1, Math.floor(d._norm.length * 0.25))
        if (dist <= thresh) {
          if (!best || dist < best.dist) best = { dist, d, candidate: name }
        }
      }
    }
    if (best) {
      console.log('geo.reverse fuzzy match', best.d.name, 'candidate', best.candidate, 'dist', best.dist)
      return res.json({ ok: true, method: 'nominatim-fuzzy', district: { id: best.d.id, name: best.d.name }, lat, lon, candidate: best.candidate, dist: best.dist });
    }

    console.log('geo.reverse no match for candidates')
    res.json({ ok: true, method: 'nominatim', lat, lon, note: 'no exact district match found', candidates });
  } catch (err) {
    console.error('geo reverse error', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

module.exports = router;
