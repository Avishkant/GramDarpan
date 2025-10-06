Importing district polygons (quick guide)

This project supports importing GeoJSON district polygon boundaries into the `districts` collection. When `districts[].geo` is present, the server performs a DB polygon point-in-polygon match which is authoritative and avoids external geocoding calls.

Scripts

- scripts/import_district_geojson.js
  - Usage: `node scripts/import_district_geojson.js /path/to/file.geojson`
  - The script finds features in the GeoJSON and attempts to match by name to existing `districts` documents. If no match is found it will upsert a new district with `state: 'Madhya Pradesh'` and the geometry.

- scripts/fetch_district_boundaries_from_nominatim.js
  - Usage: `node scripts/fetch_district_boundaries_from_nominatim.js`
  - This helper queries Nominatim for each district in the DB and attaches the returned `geojson` to the `districts` document. It waits ~1.2s between queries to be polite to Nominatim. Set `NOMINATIM_USER_AGENT` in `.env` before running.

Environment variables

- MONGO_URL (required) - MongoDB connection string
- DB_NAME (optional) - database name (default: `gramdarpan`)
- NOMINATIM_USER_AGENT (recommended) - a contact email or app identifier required by Nominatim's usage policy
- REDIS_URL (optional) - if present, the app will attempt to use Redis for caching

Notes and best practices

- Prefer importing a trusted GeoJSON source for district boundaries rather than relying on Nominatim at runtime.
- If you use the Nominatim-based import script, be mindful of rate limits and set `NOMINATIM_USER_AGENT`.
- In production, run the import once and store the GeoJSON source under version control or an artifacts bucket for reproducibility.

