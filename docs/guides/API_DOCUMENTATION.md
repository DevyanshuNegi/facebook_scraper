# Facebook Scraper API Documentation

## Overview

The Facebook Scraper API is a REST API that allows you to trigger and manage polling jobs for scraping Facebook profile emails from Google Sheets.

## Base URL

- **Local**: `http://localhost:3000`
- **Production**: `https://your-app.railway.app`

## Authentication

Currently, no authentication is required. **Important**: Add authentication before deploying to production.

## Endpoints

### Health Check

**GET** `/health`

Check if the API server is running.

**Response**:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "activeJobs": 2,
  "timestamp": "2025-11-23T04:43:12.008Z"
}
```

---

### API Documentation

**GET** `/`

Get API documentation and available endpoints.

**Response**:
```json
{
  "name": "Facebook Scraper API",
  "version": "1.0.0",
  "endpoints": {
    "GET /health": "Health check",
    "POST /api/start": "Start polling job (body: { sheetId })",
    "GET /api/status/:jobId": "Get job status",
    "POST /api/stop/:jobId": "Stop polling job",
    "GET /api/jobs": "List all jobs"
  }
}
```

---

### Start Polling Job

**POST** `/api/start`

Start a new polling job for a Google Sheet.

**Request Body**:
```json
{
  "sheetId": "your_google_sheet_id"
}
```

**Response** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "sheetId": "your_google_sheet_id",
  "status": "started",
  "message": "Polling job started successfully"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Missing required field: sheetId"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "1ABC123xyz"}'
```

---

### Get Job Status

**GET** `/api/status/:jobId`

Get the status and statistics of a polling job.

**Response** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "sheetId": "your_google_sheet_id",
  "status": "running",
  "stats": {
    "processed": 10,
    "pending": 5,
    "failed": 2,
    "startedAt": "2025-11-23T04:43:12.008Z"
  }
}
```

**Status Values**:
- `running` - Job is actively polling and processing
- `stopping` - Job is being stopped
- `stopped` - Job has been manually stopped
- `completed` - Job finished processing all rows
- `error` - Job encountered an error

**Error Response** (404 Not Found):
```json
{
  "error": "Job not found",
  "jobId": "invalid-job-id"
}
```

**Example**:
```bash
curl http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000
```

---

### Stop Polling Job

**POST** `/api/stop/:jobId`

Stop a running polling job.

**Response** (200 OK):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "stopped",
  "message": "Job stopped successfully"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/stop/550e8400-e29b-41d4-a716-446655440000
```

---

### List All Jobs

**GET** `/api/jobs`

Get a list of all polling jobs (active and completed).

**Response** (200 OK):
```json
{
  "count": 2,
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "sheetId": "sheet_1",
      "status": "running",
      "stats": {
        "processed": 10,
        "pending": 5,
        "failed": 2,
        "startedAt": "2025-11-23T04:43:12.008Z"
      }
    },
    {
      "jobId": "660e8400-e29b-41d4-a716-446655440001",
      "sheetId": "sheet_2",
      "status": "completed",
      "stats": {
        "processed": 50,
        "pending": 0,
        "failed": 3,
        "startedAt": "2025-11-23T03:00:00.000Z",
        "completedAt": "2025-11-23T04:00:00.000Z"
      }
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3000/api/jobs
```

---

## Google Sheet Structure

Your Google Sheet must have the following columns:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | `url` | Facebook profile URL (input) | `https://facebook.com/profile123` |
| B | `email` | Extracted email (output) | `contact@example.com` |
| C | `status` | Processing status flag | `Done` / `Processing` / `Failed` |

### Status Values

- **Empty** - Row is pending, will be processed
- **Processing** - Row is currently being scraped
- **Done** - Row has been successfully processed
- **Failed** - Row processing failed (check logs)

---

## Workflow Example

1. **Prepare Google Sheet**:
   - Create a sheet with columns: `url`, `email`, `status`
   - Add Facebook profile URLs in column A
   - Leave `email` and `status` columns empty

2. **Start Polling Job**:
   ```bash
   curl -X POST http://localhost:3000/api/start \
     -H "Content-Type: application/json" \
     -d '{"sheetId": "1ABC123xyz"}'
   ```
   
   Response: `{ "jobId": "550e8400-...", ... }`

3. **Monitor Progress**:
   ```bash
   curl http://localhost:3000/api/status/550e8400-...
   ```

4. **Check Google Sheet**:
   - Rows will be marked as "Processing" → "Done"
   - Emails will be filled in column B

5. **Add More Rows**:
   - Simply add new URLs to the sheet
   - They'll be picked up in the next polling cycle (12 seconds)

6. **Stop Job** (optional):
   ```bash
   curl -X POST http://localhost:3000/api/stop/550e8400-...
   ```

---

## Configuration

Environment variables (`.env`):

```bash
# Server Configuration
PORT=3000

# Polling Configuration
POLLING_INTERVAL_MS=12000  # 12 seconds (5 polls/min)
PARALLEL_BATCH_SIZE=5      # Process 5 URLs concurrently

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Facebook Cookies
FACEBOOK_COOKIES=[{"name":"c_user","value":"..."}]
```

---

## Rate Limiting

- **Polling Interval**: 12 seconds (5 requests/minute to Google Sheets API)
- **Google Sheets API Limit**: 60 requests/minute (we use ~8% of quota)
- **Parallel Processing**: 5 URLs processed concurrently per polling cycle

---

## Error Handling

- **Invalid URLs**: Marked as "Failed" in the sheet
- **Network Errors**: Automatic retry with cookie rotation
- **Google Sheets API Errors**: Logged and polling continues
- **Browser Crashes**: Automatic recovery

---

## Deployment

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for deployment instructions.
