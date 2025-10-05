# Backend API Testing Guide with Postman

This guide provides exact Postman configurations to test all backend API endpoints.

## Prerequisites

1. **Start the Backend Server**
   ```powershell
   cd backend
   npm install
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

2. **Ensure MongoDB is Running**
   - The backend requires MongoDB connection
   - Update `MONGO_URL` in `backend/.env` with your MongoDB connection string
   - Default: `mongodb://localhost:27017` (requires local MongoDB)
   - Or use MongoDB Atlas: `mongodb+srv://<user>:<password>@cluster.mongodb.net/`

## Postman Environment Setup

Create a new environment in Postman named "GramDarpan Local" with these variables:

| Variable Name | Initial Value | Current Value |
|--------------|---------------|---------------|
| `baseUrl` | `http://localhost:5000` | `http://localhost:5000` |
| `adminToken` | `change-me-to-a-secure-token` | `change-me-to-a-secure-token` |
| `districtId` | _(leave empty)_ | _(will be set by tests)_ |
| `districtName` | _(leave empty)_ | _(will be set by tests)_ |

## API Endpoints

### 1. Health Check

**Purpose:** Verify the backend server is running

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/health`
- **Headers:** None
- **Body:** None
- **Expected Response (200 OK):**
  ```json
  {
    "ok": true
  }
  ```

**Postman Tests Tab:**
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has ok property", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("ok");
    pm.expect(json.ok).to.eql(true);
});
```

---

### 2. List Districts

**Purpose:** Get all available districts

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/districts`
- **Headers:** None
- **Body:** None
- **Expected Response (200 OK):**
  ```json
  [
    {
      "id": "bhopal",
      "name": "Bhopal"
    },
    {
      "id": "indore",
      "name": "Indore"
    }
  ]
  ```

**Postman Tests Tab:**
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is an array", function () {
    const json = pm.response.json();
    pm.expect(Array.isArray(json)).to.be.true;
});

// Save first district for later use
pm.test("Save district info", function () {
    const json = pm.response.json();
    if (json.length > 0) {
        pm.environment.set("districtId", json[0].id);
        pm.environment.set("districtName", json[0].name);
        console.log("Saved district: " + json[0].name);
    }
});
```

**Note:** If this returns an empty array, you need to run the ETL first (see Admin: Run ETL below).

---

### 3. Get District Metrics

**Purpose:** Get time-series data and comparison metrics for a specific district

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/{{districtId}}/metrics`
- **Headers:** None
- **Body:** None
- **Expected Response (200 OK):**
  ```json
  {
    "district_id": "bhopal",
    "name": "Bhopal",
    "timeseries": [
      {
        "month": "2023-01",
        "beneficiaries": 1234,
        "days_worked": 567
      },
      {
        "month": "2023-02",
        "beneficiaries": 1345,
        "days_worked": 589
      }
    ],
    "comparison": {
      "state_percentile": 78,
      "latest_month": "2023-02",
      "latest_beneficiaries": 1345
    }
  }
  ```

**Expected Response (404 Not Found) - if no data exists:**
  ```json
  {
    "error": "not found"
  }
  ```

**Postman Tests Tab:**
```javascript
pm.test("Status is 200 or 404", function () {
    pm.expect([200, 404]).to.include(pm.response.code);
});

if (pm.response.code === 200) {
    pm.test("Response has required fields", function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property("district_id");
        pm.expect(json).to.have.property("name");
        pm.expect(json).to.have.property("timeseries");
        pm.expect(json).to.have.property("comparison");
    });

    pm.test("Timeseries is an array", function () {
        const json = pm.response.json();
        pm.expect(Array.isArray(json.timeseries)).to.be.true;
    });
}
```

**Manual Testing:** You can also test with a specific district ID in the URL:
- Example: `http://localhost:5000/api/indore/metrics`
- Example: `http://localhost:5000/api/bhopal/metrics`

---

### 4. Admin: Run ETL

**Purpose:** Trigger ETL process to fetch and populate data from data.gov.in

- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/admin/run-etl`
- **Headers:**
  - `x-admin-token`: `{{adminToken}}`
  - `Content-Type`: `application/json`
- **Body (raw JSON):**
  ```json
  {
    "state": "Madhya Pradesh"
  }
  ```
  _Note: The `state` field is optional and defaults to "Madhya Pradesh" if omitted._

- **Expected Response (200 OK):**
  ```json
  {
    "ok": true,
    "message": "ETL started"
  }
  ```

- **Expected Response (401 Unauthorized) - if token is wrong:**
  ```json
  {
    "error": "unauthorized"
  }
  ```

**Postman Tests Tab:**
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("ETL started successfully", function () {
    const json = pm.response.json();
    pm.expect(json.ok).to.eql(true);
    pm.expect(json.message).to.include("started");
});
```

**Important Notes:**
- ETL runs asynchronously in the background
- Check server logs to monitor ETL progress
- ETL may take several minutes depending on data volume
- Use "Admin: Get ETL Status" to check completion

---

### 5. Admin: Get ETL Status

**Purpose:** View recent ETL run history and status

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/admin/etl-status`
- **Headers:**
  - `x-admin-token`: `{{adminToken}}`
- **Body:** None
- **Expected Response (200 OK):**
  ```json
  [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "state": "Madhya Pradesh",
      "started_at": "2025-01-15T10:30:00.000Z",
      "finished_at": "2025-01-15T10:35:23.456Z",
      "pages": 10,
      "records_fetched": 1000,
      "status": "ok"
    }
  ]
  ```

**Postman Tests Tab:**
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is an array", function () {
    const json = pm.response.json();
    pm.expect(Array.isArray(json)).to.be.true;
});

pm.test("Check ETL runs", function () {
    const json = pm.response.json();
    if (json.length > 0) {
        const latestRun = json[0];
        console.log("Latest ETL status: " + latestRun.status);
        console.log("Records fetched: " + latestRun.records_fetched);
    }
});
```

---

### 6. Geo Auto-Detection

**Purpose:** Auto-detect district based on client IP address (best effort)

- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/geo/auto`
- **Headers:** None (or optionally `x-forwarded-for` for testing)
- **Body:** None
- **Expected Response (200 OK) - District matched:**
  ```json
  {
    "ok": true,
    "method": "nominatim",
    "district": {
      "id": "bhopal",
      "name": "Bhopal"
    },
    "lat": 23.2599,
    "lon": 77.4126
  }
  ```

- **Expected Response (200 OK) - No district match:**
  ```json
  {
    "ok": true,
    "method": "ip",
    "lat": 23.2599,
    "lon": 77.4126,
    "note": "no exact district match found"
  }
  ```

- **Expected Response (200 OK) - IP lookup failed:**
  ```json
  {
    "ok": false,
    "reason": "ip-lookup-failed"
  }
  ```

**Testing with Custom IP (Optional):**
To simulate a request from a specific public IP address, add a header:
- Header: `x-forwarded-for`
- Value: `103.61.72.10` (or any public Indian IP)

**Postman Tests Tab:**
```javascript
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has ok property", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("ok");
});
```

**Important Notes:**
- Local requests (127.0.0.1) may not return meaningful location data
- Uses ip-api.com (rate-limited, free service)
- Uses Nominatim for reverse geocoding (please respect rate limits)
- Best tested with public IP or deployed server

---

## Common Issues & Troubleshooting

### Port Already in Use (EADDRINUSE)

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Find and Kill Process Using Port 5000:**
   
   **Windows (PowerShell):**
   ```powershell
   # Find the process
   netstat -ano | findstr :5000
   # Kill it (replace <PID> with actual process ID)
   taskkill /PID <PID> /F
   ```

   **Linux/Mac:**
   ```bash
   # Find and kill in one command
   lsof -ti:5000 | xargs kill -9
   ```

2. **Use a Different Port:**
   - Edit `backend/.env` and change `PORT=5000` to `PORT=3000` (or any other port)
   - Update Postman `baseUrl` to use the new port

3. **Set PORT via Environment Variable:**
   ```powershell
   $env:PORT=3000; npm start
   ```

### Empty Districts Response

**Issue:** `/api/districts` returns `[]`

**Solution:** Run the ETL first:
1. Use the "Admin: Run ETL" Postman request
2. Or run manually: `npm run etl` from backend folder
3. Wait for ETL to complete (check logs)
4. Retry the districts request

### MongoDB Connection Failed

**Error Message:**
```
Failed to connect to MongoDB
```

**Solutions:**
1. Ensure MongoDB is running locally
2. Check `MONGO_URL` in `backend/.env`
3. For MongoDB Atlas, ensure connection string includes username/password
4. Check network connectivity

### 401 Unauthorized on Admin Endpoints

**Issue:** Admin endpoints return `{ "error": "unauthorized" }`

**Solution:**
1. Verify `x-admin-token` header matches `ADMIN_TOKEN` in `backend/.env`
2. Default token: `change-me-to-a-secure-token`
3. Update Postman environment variable `adminToken` to match

---

## Recommended Testing Flow

1. **Health Check** → Confirm server is running
2. **Run ETL** (Admin) → Populate the database (only needed once)
3. **Check ETL Status** (Admin) → Wait for completion
4. **List Districts** → Confirm data loaded, save district ID
5. **Get Metrics** → View time-series data for saved district
6. **Geo Auto** (Optional) → Test IP-based detection

---

## Creating a Postman Collection

To save time, you can create a Postman Collection with all requests:

1. In Postman, click "New" → "Collection"
2. Name it "GramDarpan API"
3. Add each request above to the collection
4. Set the environment to "GramDarpan Local"
5. Run the collection using Collection Runner

---

## Advanced: Automated Testing

For automated testing, consider:
- Use Collection Runner with Tests to validate all endpoints
- Export collection and use Newman (Postman CLI) for CI/CD
- Add more assertions in Tests tab for stricter validation

---

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables in `.env`
3. Ensure MongoDB is accessible
4. Check that required npm packages are installed

For the EADDRINUSE error specifically, the backend now provides helpful error messages with exact commands to resolve the issue.
