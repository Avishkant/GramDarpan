const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');

// Import route modules
const healthRoutes = require('./routes/health');
const districtRoutes = require('./routes/districts');
const metricsRoutes = require('./routes/metrics');
const adminRoutes = require('./routes/admin');
const geoRoutes = require('./routes/geo');

const app = express();
app.use(cors());
app.use(express.json());

let server;

async function start() {
  try {
    // Connect to MongoDB
    await db.connect();

    // Mount routes
    app.use('/api/health', healthRoutes);
    app.use('/api/districts', districtRoutes);
    app.use('/api', metricsRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/geo', geoRoutes);

    // Optional: run ETL on startup if explicitly enabled
    if (config.START_ETL_ON_BOOT) {
      console.log('START_ETL_ON_BOOT is true — running ETL once at startup');
      const { fetchAndStore } = require('./etl/fetch_mgnrega');
      fetchAndStore('Madhya Pradesh')
        .then(() => console.log('Startup ETL completed'))
        .catch(err => console.error('Startup ETL failed', err));
    }

    // Start server with error handling for port conflicts
    const port = config.PORT;
    server = app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
    });

    // Handle port in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${port} is already in use.`);
        console.error('\nPossible solutions:');
        console.error(`1. Kill the process using port ${port}:`);
        console.error(`   - Windows: netstat -ano | findstr :${port} && taskkill /PID <PID> /F`);
        console.error(`   - Linux/Mac: lsof -ti:${port} | xargs kill -9`);
        console.error(`2. Change the PORT in your .env file to use a different port`);
        console.error(`3. Set PORT environment variable: PORT=3000 npm start\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  await db.close();
  process.exit(0);
});

start();
