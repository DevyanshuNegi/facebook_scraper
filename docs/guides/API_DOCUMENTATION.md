# API Documentation - Microservices

## Overview

The Facebook Scraper API now uses a **microservices architecture** with BullMQ for job queue management.

### Architecture
```
API → scrape-queue → Worker → results-queue → Syncer → Google Sheets
```

---

## Base URL
```
http://localhost:3000
```

---

## Endpoints

### 1. Health Check
**GET** `/health`

Check API server health.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "activeJobs": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Start Queue-Based Scraping ⭐ NEW
**POST** `/api/start-queue`

Add URLs to scrape-queue for processing by Worker service.

**Request Body:**
```json
{
  "sheetId": "your_google_sheet_id",
  "urls": [
    "https://facebook.com/page1",
    "https://facebook.com/page2"
  ]
}
```

**Response:**
```json
{
  "sheetId": "your_google_sheet_id",
  "jobsAdded": 2,
  "jobs": [
    {
      "jobId": "your_google_sheet_id-row-2",
      "url": "https://facebook.com/page1"
    },
    {
      "jobId": "your_google_sheet_id-row-3",
      "url": "https://facebook.com/page2"
    }
  ],
  "message": "URLs added to scrape queue successfully",
  "monitoringUrl": "/admin/queues"
}
```

**Features:**
- ✅ Job persistence (survives crashes)
- ✅ Parallel processing (3 workers)
- ✅ Automatic retries (3 attempts)
- ✅ Rate limiting protection

---

### 3. Start Legacy Polling Job
**POST** `/api/start`

Start in-memory polling job (backward compatible).

**Request Body:**
```json
{
  "sheetId": "your_google_sheet_id"
}
```

**Response:**
```json
{
  "jobId": "uuid-v4",
  "sheetId": "your_google_sheet_id",
  "status": "started",
  "message": "Polling job started successfully (Legacy mode)"
}
```

---

### 4. Get Job Status
**GET** `/api/status/:jobId`

Get status of a legacy polling job.

**Response:**
```json
{
  "jobId": "uuid-v4",
  "sheetId": "your_google_sheet_id",
  "status": "running",
  "stats": {
    "processed": 10,
    "pending": 5,
    "failed": 1,
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5. Stop Job
**POST** `/api/stop/:jobId`

Stop a legacy polling job.

**Response:**
```json
{
  "jobId": "uuid-v4",
  "status": "stopped",
  "message": "Job stopped successfully"
}
```

---

### 6. List All Jobs
**GET** `/api/jobs`

List all legacy polling jobs.

**Response:**
```json
{
  "count": 2,
  "jobs": [
    {
      "jobId": "uuid-v4",
      "sheetId": "sheet-id",
      "status": "running",
      "stats": { ... }
    }
  ]
}
```

---

### 7. Bull Board - Queue Dashboard
**GET** `/admin/queues`

Access Bull Board monitoring UI (open in browser).

**Features:**
- View queue statistics
- Monitor job progress
- Retry failed jobs
- View job details

---

## Queue-Based vs Legacy

| Feature | Queue-Based (`/api/start-queue`) | Legacy (`/api/start`) |
|---------|----------------------------------|----------------------|
| **Resilience** | ✅ Jobs persist in Redis | ❌ Lost on crash |
| **Scalability** | ✅ Horizontal (N workers) | ❌ Single instance |
| **Monitoring** | ✅ Bull Board UI | ⚠️ Limited |
| **Rate Limits** | ✅ Protected (Syncer batches) | ⚠️ Risk |
| **Retries** | ✅ Automatic (3x) | ⚠️ Manual |

**Recommendation**: Use `/api/start-queue` for production.

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: sheetId"
}
```

### 404 Not Found
```json
{
  "error": "Job not found",
  "jobId": "uuid-v4"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to start job",
  "message": "Connection refused"
}
```

---

## Monitoring

### Bull Board
```
http://localhost:3000/admin/queues
```

Monitor:
- **scrape-queue**: URLs waiting to be scraped
- **results-queue**: Results waiting to be written

---

## Example Workflow

### 1. Add URLs to Queue
```bash
curl -X POST http://localhost:3000/api/start-queue \
  -H "Content-Type: application/json" \
  -d '{
    "sheetId": "YOUR_SHEET_ID",
    "urls": ["https://facebook.com/page1"]
  }'
```

### 2. Monitor Progress
```bash
# Open Bull Board
open http://localhost:3000/admin/queues
```

### 3. Check Google Sheet
Results appear after Syncer flushes (50 items or 30s).

---

## Services

### API Server
```bash
npm start
# or
npm run dev  # All services
```

### Worker Service
```bash
npm run worker
```

### Syncer Service
```bash
npm run syncer
```

---

## Environment Variables

```bash
PORT=3000
WORKER_CONCURRENCY=3
SYNC_BUFFER_SIZE=50
SYNC_FLUSH_INTERVAL_MS=30000
REDIS_HOST=localhost
REDIS_PORT=6379
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
FACEBOOK_COOKIES=[...]
```

---

## Rate Limits

### Google Sheets API
- Limit: ~100 writes/minute
- Protection: Syncer batches 50 writes → 1 API call

### Facebook
- Rate limiting: 10 jobs/second (Worker)
- Cookie rotation: Supported via env var

---

## Testing

```bash
# Infrastructure
node src/tests/test-queue.js

# Worker
node src/tests/test-worker.js

# End-to-End
node src/tests/test-e2e.js YOUR_SHEET_ID
```

---

## Postman Collection

Import: `config/postman_collection.json`

**Includes:**
- Health check
- Queue-based scraping
- Legacy endpoints
- Bull Board access
