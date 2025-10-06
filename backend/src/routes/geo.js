const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const config = require('../config');

router.get('/auto', async (req, res) => {
  try {
    // Determine client IP (supporting common headers)
    const ip = req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : req.socket.remoteAddress;
    
    // Use ip-api.com for quick IP geolocation (no key, limited rate). Returns lat/lon and region data.
    const ipResp = await fetch(`http://ip-api.com/json/${ip}`);
    const ipJson = await ipResp.json();
    
    if (!ipJson || ipJson.status !== 'success') {
      return res.json({ ok: false, reason: 'ip-lookup-failed' });
    }

    const { lat, lon } = { lat: ipJson.lat, lon: ipJson.lon };

    // Reverse geocode using Nominatim
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en`;
    const nomResp = await fetch(nomUrl, {
      headers: { 'User-Agent': config.NOMINATIM_USER_AGENT }
    });
    const nomJson = await nomResp.json();

    // Try to extract district name from nominatim (village/town/county/state_district)
    const candidates = [
      nomJson.address?.district,
      nomJson.address?.county,
      nomJson.address?.city,
      nomJson.address?.town,
      nomJson.address?.village
    ];
    const cleaned = candidates.filter(Boolean).map(s => String(s).trim());

    // Try matching by name against districts collection
    const db = getDb();
    for (const name of cleaned) {
      const hit = await db.collection('districts').findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
        state: 'MP'
      });
      if (hit) {
        return res.json({
          ok: true,
          method: 'nominatim',
          district: { id: hit.id, name: hit.name },
          lat,
          lon
        });
      }
    }

    // Fallback: return lat/lon so client can ask user to confirm
    res.json({
      ok: true,
      method: 'ip',
      lat,
      lon,
      note: 'no exact district match found'
    });
  } catch (err) {
    console.error('geo auto error', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

module.exports = router;
