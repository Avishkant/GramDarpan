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

module.exports = router;
