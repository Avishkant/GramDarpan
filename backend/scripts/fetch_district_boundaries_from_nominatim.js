#!/usr/bin/env node
/**
 * Fetch district boundaries from Nominatim for districts in DB (state contains 'Madhya')
 * Usage: node scripts/fetch_district_boundaries_from_nominatim.js
 * NOTE: This will make one request per district (about 52). It waits ~1.2s between requests to be polite.
 */
const { MongoClient } = require('mongodb')
const config = require('../src/config')

const NOMINATIM_USER_AGENT = config.NOMINATIM_USER_AGENT || 'gramdarpan@example.com'
const NOM_URL = 'https://nominatim.openstreetmap.org/search.php'

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function fetchJson(url){
  const resp = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

async function main(){
  const client = new MongoClient(config.MONGO_URL || 'mongodb://localhost:27017')
  await client.connect()
  const db = client.db(config.DB_NAME || 'gramdarpan')
  const districts = await db.collection('districts').find({ state: { $regex: 'Madhya', $options: 'i' } }).toArray()
  console.log('Found districts to process:', districts.length)
  let updated = 0
  for (const d of districts){
    const q = encodeURIComponent(`${d.name} Madhya Pradesh India`)
    const url = `${NOM_URL}?q=${q}&format=jsonv2&polygon_geojson=1&limit=1`
    try{
      const res = await fetchJson(url)
      if (Array.isArray(res) && res.length){
        const place = res[0]
        if (place && place.geojson){
          await db.collection('districts').updateOne({ _id: d._id }, { $set: { geo: place.geojson, geo_source: 'nominatim', geo_place_id: place.place_id } })
          updated += 1
          console.log('Updated', d.name)
        } else {
          console.log('No geojson for', d.name)
        }
      } else {
        console.log('No results for', d.name)
      }
    }catch(err){
      console.warn('Error for', d.name, err && err.message)
    }
    await sleep(1200)
  }
  console.log('Done. Updated:', updated)
  await client.close()
}

main().catch(e=>{ console.error(e); process.exit(1) })
