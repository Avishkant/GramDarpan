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

// Configure CORS: in production set CLIENT_URL in env to the allowed origin.
// In local development when CLIENT_URL is not set, allow all origins for convenience.
const corsOptions = {}
if (config.CLIENT_URL) {
  corsOptions.origin = config.CLIENT_URL
  console.log('CORS: restricting to origin', config.CLIENT_URL)
} else {
  corsOptions.origin = true // allow all
  console.log('CORS: allowing all origins (no CLIENT_URL set)')
}
app.use(cors(corsOptions));
app.use(express.json());

// Optional rate-limiting (use express-rate-limit if installed)
let rateLimit
try {
  rateLimit = require('express-rate-limit')
} catch (e) {
  rateLimit = null
}

// Simple default limiter fallback if module not available
const defaultLimiter = (req, res, next) => next()

// Redis client optional (used later by routes if available)
let redisClient = null
if (process.env.REDIS_URL) {
  try {
    const IoRedis = require('ioredis')
    redisClient = new IoRedis(process.env.REDIS_URL)
    redisClient.on('error', (e) => console.warn('Redis error', e && e.message))
  } catch (e) {
    console.warn('ioredis not installed or failed to init; proceeding without Redis')
    redisClient = null
  }
}

// Apply rate limits to important routes
const geoLimiter = rateLimit ? rateLimit({ windowMs: 60 * 1000, max: 30 }) : defaultLimiter
const reportLimiter = rateLimit ? rateLimit({ windowMs: 60 * 1000, max: 60 }) : defaultLimiter
const adminLimiter = rateLimit ? rateLimit({ windowMs: 60 * 1000, max: 5 }) : defaultLimiter

async function start() {
  await db.connect();

  // expose redis client and cache module to routes via app.locals
  app.locals.redisClient = redisClient
  try {
    app.locals.cache = require('./cache')
  } catch (e) {
    app.locals.cache = null
  }

    // optional scheduler
    try {
      const scheduler = require('./scheduler')
      scheduler.startScheduler()
    } catch (e) {
      // scheduler optional
    }

  app.use('/api/health', healthRoutes);
  app.use('/api/districts', districtRoutes);
  app.use('/api', metricsRoutes);
  app.use('/api/report', reportLimiter, (req, res, next) => { req.redisClient = redisClient; next()}, reportRoutes);
  app.use('/api/admin', adminLimiter, (req, res, next) => { req.redisClient = redisClient; next()}, adminRoutes);
  app.use('/api/geo', geoLimiter, (req, res, next) => { req.redisClient = redisClient; next()}, geoRoutes);

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
