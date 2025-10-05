const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');

const healthRoutes = require('./routes/health');
const districtRoutes = require('./routes/districts');
const metricsRoutes = require('./routes/metrics');
const adminRoutes = require('./routes/admin');
const geoRoutes = require('./routes/geo');
const reportRoutes = require('./routes/report');

const app = express();
app.use(cors());
app.use(express.json());

async function start() {
  await db.connect();

  app.use('/api/health', healthRoutes);
  app.use('/api/districts', districtRoutes);
  app.use('/api', metricsRoutes);
  app.use('/api/report', reportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/geo', geoRoutes);

  const port = config.PORT;
  const server = app.listen(port, () => console.log('Backend running on', port));
  server.on('error', err => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${port} already in use. Kill the process using it or change PORT in .env and restart.`);
      process.exit(1);
    }
    console.error('Server error', err);
    process.exit(1);
  });

  // graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    server.close(() => {
      db.close && db.close();
      process.exit(0);
    });
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
