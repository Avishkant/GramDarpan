const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');

const healthRoutes = require('./routes/health');
const districtRoutes = require('./routes/districts');
const metricsRoutes = require('./routes/metrics');
const adminRoutes = require('./routes/admin');
const geoRoutes = require('./routes/geo');

const app = express();
app.use(cors());
app.use(express.json());

async function start() {
  await db.connect();

  app.use('/api/health', healthRoutes);
  app.use('/api/districts', districtRoutes);
  app.use('/api', metricsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/geo', geoRoutes);

  const port = config.PORT;
  app.listen(port, () => console.log('Backend running on', port));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
