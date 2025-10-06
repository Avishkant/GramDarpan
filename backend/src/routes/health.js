const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', async (req, res) => {
	const db = (() => { try { return getDb() } catch(e) { return null } })()
	const out = { ok: true, time: new Date().toISOString() }
	try {
		if (db) {
			const total = await db.collection('districts').countDocuments()
			const withGeo = await db.collection('districts').countDocuments({ geo: { $exists: true } })
			out.db = { totalDistricts: total, withGeo }
		} else {
			out.db = { connected: false }
		}
	} catch (e) {
		out.db = { error: String(e) }
	}

	// cache stats from app.locals.cache if available
	try {
		const cache = req.app && req.app.locals && req.app.locals.cache
		if (cache && cache.stats) {
			out.cache = cache.stats()
		}
	} catch (e) { out.cacheErr = String(e) }

	// redis presence
	try {
		out.redis = !!(req.app && req.app.locals && req.app.locals.redisClient)
	} catch (e) { out.redis = false }

	res.json(out)
})

module.exports = router;
