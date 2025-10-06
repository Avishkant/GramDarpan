/**
 * Usage: node scripts/import_district_geojson.js /path/to/mp_districts.geojson
 * The script will upsert districts by matching on a name candidate (case-insensitive)
 * and set the `geo` field to the GeoJSON geometry object.
 */
const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')
const config = require('../src/config')

async function main() {
  const fp = process.argv[2]
  if (!fp) {
    console.error('Usage: node scripts/import_district_geojson.js /path/to/file.geojson')
    process.exit(2)
  }
  const full = path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp)
  if (!fs.existsSync(full)) {
    console.error('File not found', full)
    process.exit(2)
  }

  const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
  const features = raw.type === 'FeatureCollection' ? raw.features : (raw.features || [])
  const client = new MongoClient(config.MONGO_URL || 'mongodb://localhost:27017')
  await client.connect()
  const db = client.db(config.DB_NAME || 'gramdarpan')
  let imported = 0
  for (const f of features) {
    const props = f.properties || {}
    const geom = f.geometry
    // try to find a candidate name field
    const names = [props.name, props.NAME, props.district, props.DISTRICT, props.ADM1_NAME, props.DISTRICT_N, props.NOM, props.NAME_2].filter(Boolean)
    const nameCandidates = names.map(n => String(n).trim()).filter(Boolean)
    if (!nameCandidates.length) continue
    // attempt to match by name ignoring common suffixes and case
    const matchRegex = nameCandidates.map(n => n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')
    const q = { name: { $regex: matchRegex, $options: 'i' } }
    const hit = await db.collection('districts').findOne(q)
    if (hit) {
      await db.collection('districts').updateOne({ _id: hit._id }, { $set: { geo: geom } })
      imported += 1
    } else {
      // insert new district if no match
      const id = nameCandidates[0].toLowerCase().replace(/\s+/g,'_')
      await db.collection('districts').updateOne({ id }, { $set: { id, name: nameCandidates[0], state: 'Madhya Pradesh', geo: geom } }, { upsert: true })
      imported += 1
    }
  }
  console.log('Imported/updated', imported, 'district geometries')
  await client.close()
}

main().catch(err => { console.error(err); process.exit(1) })
