// Clean single implementation for /api/geo routes
const express = require('express')
const router = express.Router()
const { getDb } = require('../db')

// Helpers
function pointInPolygon(lon, lat, geojson) {
  if (!geojson) return false
  const x = Number(lon), y = Number(lat)
  const pnpoly = (px, py, vs) => {
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1]
      const xj = vs[j][0], yj = vs[j][1]
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 0.0) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }
  if (geojson.type === 'Polygon') return pnpoly(x, y, geojson.coordinates[0] || [])
  if (geojson.type === 'MultiPolygon') {
    for (const poly of geojson.coordinates || []) {
      if (pnpoly(x, y, poly[0] || [])) return true
    }
    return false
  }
  return false
}

const levenshtein = (a, b) => {
  a = String(a || '')
  b = String(b || '')
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

const normalize = s => String(s || '').toLowerCase().replace(/\b(district|zilla|zila|districts)\b/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

// /api/geo/auto - IP-based fallback (returns candidates and lat/lon)
router.get('/auto', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress
    const ipResp = await fetch(`http://ip-api.com/json/${ip}`)
    const ipJson = await ipResp.json()
    if (!ipJson || ipJson.status !== 'success') return res.json({ ok: false, reason: 'ip-lookup-failed' })
    const { lat, lon } = { lat: ipJson.lat, lon: ipJson.lon }
    // quick nominatim probe to collect candidates
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en&polygon_geojson=1`
    const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } })
    const nomJson = await nomResp.json()
    const addr = nomJson.address || {}
    const candidates = []
    ;['district', 'county', 'city_district', 'state_district', 'city', 'town', 'village', 'municipality', 'suburb', 'hamlet', 'locality', 'region', 'county_code', 'administrative'].forEach(k => { if (addr[k]) candidates.push(String(addr[k]).trim()) })
    if (nomJson.display_name) nomJson.display_name.split(',').map(s => s.trim()).forEach(tok => { if (tok) candidates.push(tok) })
    return res.json({ ok: true, method: 'ip', lat, lon, candidates })
  } catch (err) {
    console.error('geo.auto error', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// /api/geo/reverse - lat/lon -> district mapping
router.post('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.body || {}
    if (lat === undefined || lon === undefined) return res.status(400).json({ ok: false, error: 'lat/lon required' })
    const db = getDb()

    // 1) Try DB polygons first (fast & authoritative if present)
    try {
      const districtsWithGeo = await db.collection('districts').find({ geo: { $exists: true } }).toArray()
      for (const d of districtsWithGeo) {
        if (d.geo && (d.geo.type === 'Polygon' || d.geo.type === 'MultiPolygon')) {
          try {
            if (pointInPolygon(lon, lat, d.geo)) {
              const stateName = String(d.state || '').toLowerCase()
              if (!stateName.includes('madhya') && !stateName.includes('mp')) return res.json({ ok: true, method: 'db-geo', in_mp: false, message: 'location outside Madhya Pradesh' })
              return res.json({ ok: true, method: 'db-geo', district: { id: d.id, name: d.name }, lat, lon })
            }
          } catch (err) { /* ignore per-district polygon errors */ }
        }
      }
    } catch (err) {
      console.warn('db geo check failed', err && err.message)
    }

    // 2) Nominatim reverse
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en&polygon_geojson=1`
    const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } })
    const nomJson = await nomResp.json()
    const addr = nomJson.address || {}
    const candidates = []
    ;['district', 'county', 'city_district', 'state_district', 'city', 'town', 'village', 'municipality', 'suburb', 'hamlet', 'locality', 'region', 'administrative', 'county_code'].forEach(k => { if (addr[k]) candidates.push(String(addr[k]).trim()) })
    if (nomJson.display_name) nomJson.display_name.split(',').map(s => s.trim()).forEach(tok => { if (tok) candidates.push(tok) })

    // Enrich via lookup if place_id present
    if (nomJson.place_id) {
      try {
        const lookupUrl = `https://nominatim.openstreetmap.org/lookup?format=jsonv2&place_ids=${nomJson.place_id}&extratags=1&namedetails=1`
        const lookupResp = await fetch(lookupUrl, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'gramdarpan' } })
        const lookupJson = await lookupResp.json()
        if (Array.isArray(lookupJson) && lookupJson.length) {
          const ld = lookupJson[0]
          if (ld.namedetails) Object.values(ld.namedetails).forEach(v => { if (v) candidates.push(String(v).trim()) })
          if (ld.extratags) Object.values(ld.extratags).forEach(v => { if (v) candidates.push(String(v).trim()) })
          if (ld.display_name) ld.display_name.split(',').map(s => s.trim()).forEach(tok => { if (tok) candidates.push(tok) })
        }
      } catch (err) { console.warn('nominatim lookup failed', err && err.message) }
    }

    console.log('geo.reverse nominatim address candidates', candidates)

    // 3) Match candidates against DB districts
    const districts = await db.collection('districts').find({ state: { $exists: true } }).toArray()
    const normDistricts = districts.map(d => ({ ...d, _norm: normalize(d.name) }))

    // exact normalized match
    for (const name of candidates) {
      const n = normalize(name)
      const hit = normDistricts.find(d => d._norm === n)
      if (hit) {
        const stateName = String(hit.state || '').toLowerCase()
        if (!stateName.includes('madhya') && !stateName.includes('mp')) return res.json({ ok: true, method: 'nominatim-exact', in_mp: false, message: 'location outside Madhya Pradesh' })
        return res.json({ ok: true, method: 'nominatim-exact', district: { id: hit.id, name: hit.name }, lat, lon })
      }
    }

    // includes / startsWith
    for (const name of candidates) {
      const n = normalize(name)
      const hit = normDistricts.find(d => d._norm.startsWith(n) || d._norm.includes(n))
      if (hit) return res.json({ ok: true, method: 'nominatim-include', district: { id: hit.id, name: hit.name }, lat, lon, candidate: name })
    }

    // fuzzy via Levenshtein
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
      const stateName = String(best.d.state || '').toLowerCase()
      if (!stateName.includes('madhya') && !stateName.includes('mp')) return res.json({ ok: true, method: 'nominatim-fuzzy', in_mp: false, message: 'location outside Madhya Pradesh' })
      return res.json({ ok: true, method: 'nominatim-fuzzy', district: { id: best.d.id, name: best.d.name }, lat, lon, candidate: best.candidate, dist: best.dist })
    }

    // 4) polygon fallback using nominatim's geojson (if present)
    try {
      if (nomJson && nomJson.geojson) {
        const gj = nomJson.geojson
        const dname = (nomJson.display_name || '').split(',').map(s => s.trim()).find(t => t && t.length > 3)
        if (dname) {
          const dbHit = await db.collection('districts').findOne({ name: { $regex: dname, $options: 'i' } })
          if (dbHit) {
            const stateName = String(dbHit.state || '').toLowerCase()
            if (!stateName.includes('madhya') && !stateName.includes('mp')) return res.json({ ok: true, method: 'nominatim-geo', in_mp: false, message: 'location outside Madhya Pradesh' })
            if (pointInPolygon(lon, lat, gj)) return res.json({ ok: true, method: 'nominatim-geo', district: { id: dbHit.id, name: dbHit.name }, lat, lon })
          }
        }
      }
    } catch (err) { console.warn('polygon fallback failed', err && err.message) }

    // final check: if nominatim says a different state, short-circuit
    if (nomJson.address && nomJson.address.state) {
      const st = String(nomJson.address.state).toLowerCase()
      if (!st.includes('madhya') && !st.includes('mp')) return res.json({ ok: true, method: 'nominatim', in_mp: false, message: 'location outside Madhya Pradesh', state: nomJson.address.state })
    }

    // nothing matched
    res.json({ ok: true, method: 'nominatim', lat, lon, note: 'no exact district match found', candidates })
  } catch (err) {
    console.error('geo reverse error', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

module.exports = router
