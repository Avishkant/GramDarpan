// Shared in-memory caches and TTLs
const reportCache = new Map()
const geoCache = new Map()
const nominatimCache = new Map()

const REPORT_CACHE_TTL = 1000 * 60 * 30 // 30 minutes
const GEO_CACHE_TTL = 1000 * 60 * 60 // 1 hour
const NOM_CACHE_TTL = 1000 * 60 * 60 // 1 hour

function stats() {
  return {
    reportCacheSize: reportCache.size,
    geoCacheSize: geoCache.size,
    nominatimCacheSize: nominatimCache.size,
    REPORT_CACHE_TTL,
    GEO_CACHE_TTL,
    NOM_CACHE_TTL,
  }
}

module.exports = { reportCache, geoCache, nominatimCache, REPORT_CACHE_TTL, GEO_CACHE_TTL, NOM_CACHE_TTL, stats }
