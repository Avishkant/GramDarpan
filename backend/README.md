Backend (GramDarpan)
---------------------

This folder contains the Node.js backend and ETL worker for GramDarpan.

Quick start (local)

1. Install dependencies:

```powershell
cd backend
npm install
```

2. Configure `.env` (there's a sample `.env.example`). Make sure `MONGO_URL` points to your MongoDB and `DATA_GOV_API_KEY` is set.

3. Run ETL manually:

```powershell
node src/etl/fetch_mgnrega.js "Madhya Pradesh"
```

4. Start backend server in dev mode:

```powershell
npm run dev
```

Admin endpoint
- `POST /api/admin/run-etl` with header `x-admin-token: <ADMIN_TOKEN>` (or `?token=`) will trigger an ETL run asynchronously.

Notes
- The ETL uses pagination and will store raw snapshots in the `snapshots` collection and normalized records in `districts` and `district_monthly`.
- The sample API key provided by data.gov.in is rate-limited; create your own API key for full access.

Render deployment notes
-----------------------

This project can be deployed to Render as a Web Service (Node.js). Key points:

- Set the Start Command to: `npm start` (or build scripts if you add a build step).
- Set the environment variables in Render dashboard (Environment > Environment Variables):
	- `MONGO_URL` (your MongoDB Atlas connection string)
	- `DB_NAME` (GramDarpan)
	- `DATA_GOV_BASE` (https://api.data.gov.in/resource)
	- `DATA_GOV_API_KEY` (your data.gov.in API key)
	- `ADMIN_TOKEN` (a secure token to protect admin endpoints)
	- `BACKEND_URL` (optional, the public URL Render assigns)

- If you prefer periodic ETL runs on Render:
	- Use Render's Cron Jobs feature to run `node src/etl/fetch_mgnrega.js "Madhya Pradesh"` on a schedule.
	- Alternatively, keep ETL server-triggered and call `/api/admin/run-etl` from a scheduled task or an external scheduler.

Security
- Keep `ADMIN_TOKEN` secret; do not expose it in client-side code.

