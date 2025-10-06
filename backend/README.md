Backend (GramDarpan)
---------------------

This folder contains the Node.js backend and ETL worker for GramDarpan.

## Architecture

The backend follows an MVC-inspired modular architecture:

- `src/config/` - Centralized configuration and environment variables
- `src/db/` - MongoDB connection management and database utilities
- `src/routes/` - API route handlers organized by feature
  - `health.js` - Health check endpoint
  - `districts.js` - District listing
  - `metrics.js` - District metrics and time-series data
  - `admin.js` - Admin endpoints (ETL trigger, status)
  - `geo.js` - Geolocation and IP-based district detection
- `src/etl/` - ETL (Extract, Transform, Load) scripts
- `src/index.js` - Application entry point and server initialization

## Quick Start (Local)

1. **Install dependencies:**

```powershell
cd backend
npm install
```

2. **Configure `.env`** (copy from `.env.example`):

Create a `.env` file with the following variables:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=gramdarpan
PORT=5000
DATA_GOV_BASE=https://api.data.gov.in/resource
DATA_GOV_API_KEY=your-api-key-here
ADMIN_TOKEN=change-me-to-a-secure-token
NOMINATIM_USER_AGENT=gramdarpan
```

Make sure:
- `MONGO_URL` points to your MongoDB instance (local or MongoDB Atlas)
- `DATA_GOV_API_KEY` is set (get one from data.gov.in)
- `ADMIN_TOKEN` is changed to a secure value for production

3. **Run ETL manually** (optional, to populate initial data):

```powershell
node src/etl/fetch_mgnrega.js "Madhya Pradesh"
```

4. **Start backend server:**

Development mode (with auto-reload):
```powershell
npm run dev
```

Production mode:
```powershell
npm start
```

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/districts` - List all districts
- `GET /api/:id/metrics` - Get metrics for a specific district
- `GET /api/geo/auto` - Auto-detect district from IP

### Admin Endpoints (require `x-admin-token` header)
- `POST /api/admin/run-etl` - Trigger ETL run
- `GET /api/admin/etl-status` - Get ETL run history

For detailed API testing with Postman, see [POSTMAN_TESTING.md](./POSTMAN_TESTING.md).

## Troubleshooting

### Port Already in Use (EADDRINUSE)

If you see this error:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Find and kill the process using port 5000:**
   
   Windows (PowerShell):
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```
   
   Linux/Mac:
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Use a different port:**
   ```powershell
   # Edit .env file
   PORT=3000
   
   # Or set environment variable
   $env:PORT=3000; npm start
   ```

3. **The server now provides helpful error messages** with specific commands to resolve the issue.

### MongoDB Connection Issues

If the server fails to connect to MongoDB:
1. Ensure MongoDB is running
2. Verify `MONGO_URL` in `.env` is correct
3. Check network connectivity (for MongoDB Atlas, ensure IP is whitelisted)
4. Connection timeout is set to 5 seconds - if exceeded, server will exit with error message

### Empty Districts List

If `/api/districts` returns an empty array:
1. Run the ETL to populate data: `npm run etl`
2. Or use the admin API: `POST /api/admin/run-etl`
3. Check ETL status: `GET /api/admin/etl-status`

## Notes

- The ETL uses pagination and stores:
  - Raw snapshots in `snapshots` collection
  - Normalized district records in `districts` collection
  - Monthly metrics in `district_monthly` collection
  - ETL run metadata in `etl_runs` collection
- The sample API key from data.gov.in is rate-limited; create your own for production use
- Graceful shutdown handlers (SIGINT/SIGTERM) ensure proper cleanup

## Render Deployment

This project can be deployed to Render as a Web Service (Node.js).

**Setup:**
1. Set Start Command: `npm start`
2. Add environment variables in Render dashboard:
   - `MONGO_URL` - MongoDB Atlas connection string
   - `DB_NAME` - `gramdarpan`
   - `PORT` - `5000` (or let Render assign)
   - `DATA_GOV_BASE` - `https://api.data.gov.in/resource`
   - `DATA_GOV_API_KEY` - Your data.gov.in API key
   - `ADMIN_TOKEN` - Secure random token
   - `NOMINATIM_USER_AGENT` - `gramdarpan`
   - `BACKEND_URL` - (optional) Your Render app URL

**ETL on Render:**
- Use Render Cron Jobs to run ETL on schedule: `node src/etl/fetch_mgnrega.js "Madhya Pradesh"`
- Or trigger via admin API: `POST /api/admin/run-etl`

## Security

- Keep `ADMIN_TOKEN` secret; never expose in client-side code
- Use strong tokens in production
- MongoDB connection string should not be committed to version control
- Admin endpoints are protected by token authentication

## Development

**Project Structure:**
```
backend/
├── src/
│   ├── config/        # Configuration management
│   ├── db/            # Database connection
│   ├── routes/        # API routes (modular)
│   ├── etl/           # ETL scripts
│   └── index.js       # App entry point
├── .env.example       # Environment template
├── package.json       # Dependencies
└── POSTMAN_TESTING.md # API testing guide
```

**Adding New Routes:**
1. Create route file in `src/routes/`
2. Import and mount in `src/index.js`
3. Follow existing pattern for error handling

**Database Access:**
```javascript
const { getDb } = require('../db');
const db = getDb();
const collection = db.collection('your_collection');
```


