// Lightweight launcher so services can run from the backend/ root directory.
// It delegates to the real server implementation in src/index.js
try {
  require('./src/index')
} catch (e) {
  console.error('Failed to start server from backend/index.js', e)
  process.exit(1)
}
