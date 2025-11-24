# Postman Collection - Quick Start Guide

## Import the Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select the file: `postman_collection.json`
4. Collection "Facebook Scraper API" will be added to your workspace

## Configure Variables

Before testing, update the collection variables:

1. Click on the collection name "Facebook Scraper API"
2. Go to the **Variables** tab
3. Update these values:

| Variable | Current Value | Description |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:3000` | Change to Railway URL for production |
| `sheetId` | `YOUR_GOOGLE_SHEET_ID` | Your Google Sheet ID |
| `jobId` | (auto-filled) | Automatically set when you start a job |

### How to Get Your Google Sheet ID

From your Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/1ABC123xyz456/edit
                                      ^^^^^^^^^^^^
                                      This is your Sheet ID
```

## Testing Workflow

### 1. Check Server Health

**Request**: `Health Check`

Verify the server is running:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "activeJobs": 0
}
```

---

### 2. Start a Polling Job

**Request**: `Start Polling Job`

**Before sending**:
- Make sure `sheetId` variable is set to your actual Google Sheet ID
- Your sheet should have columns: `url`, `email`, `status`
- Add some Facebook profile URLs in the `url` column

**Response**:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "sheetId": "1ABC123xyz",
  "status": "started"
}
```

> **Note**: The `jobId` is automatically saved to the collection variable for use in subsequent requests!

---

### 3. Monitor Job Progress

**Request**: `Get Job Status`

Check the job status every few seconds:
```json
{
  "jobId": "550e8400-...",
  "sheetId": "1ABC123xyz",
  "status": "running",
  "stats": {
    "processed": 10,
    "pending": 5,
    "failed": 2,
    "startedAt": "2025-11-23T04:43:12.008Z"
  }
}
```

**Status values**:
- `running` - Job is actively processing
- `completed` - All rows processed
- `stopped` - Manually stopped
- `error` - Error occurred

---

### 4. List All Jobs

**Request**: `List All Jobs`

See all active and completed jobs:
```json
{
  "count": 2,
  "jobs": [
    {
      "jobId": "550e8400-...",
      "sheetId": "sheet_1",
      "status": "running",
      "stats": { ... }
    },
    {
      "jobId": "660e8400-...",
      "sheetId": "sheet_2",
      "status": "completed",
      "stats": { ... }
    }
  ]
}
```

---

### 5. Stop a Job (Optional)

**Request**: `Stop Polling Job`

Stop the job gracefully:
```json
{
  "jobId": "550e8400-...",
  "status": "stopped",
  "message": "Job stopped successfully"
}
```

---

## Testing with Production (Railway)

1. Deploy to Railway
2. Get your Railway URL (e.g., `https://your-app.railway.app`)
3. Update the `baseUrl` variable in Postman:
   - Click collection → Variables tab
   - Change `baseUrl` to `https://your-app.railway.app`
4. Run the same requests against production

---

## Tips

### Auto-Refresh Job Status

To continuously monitor a job:
1. Send "Get Job Status" request
2. Click the **Send** button dropdown → **Send and Download**
3. Or use Postman's **Collection Runner** with a delay between iterations

### Test Multiple Sheets

To test multiple sheets simultaneously:
1. Manually set `sheetId` variable to Sheet 1
2. Send "Start Polling Job" → Save jobId as `jobId1`
3. Change `sheetId` to Sheet 2
4. Send "Start Polling Job" → Save jobId as `jobId2`
5. Use "List All Jobs" to see both running

### Troubleshooting

**Error: "Missing required field: sheetId"**
- Make sure the `sheetId` variable is set
- Check the request body uses `{{sheetId}}`

**Error: "Job not found"**
- The `jobId` variable might be empty
- Run "Start Polling Job" first to generate a jobId

**Error: Connection refused**
- Make sure the server is running: `node src/index.js`
- Check the `baseUrl` is correct

---

## Example Test Scenario

```bash
# 1. Start server
node src/index.js

# 2. In Postman:
#    - Set sheetId variable to your Google Sheet ID
#    - Send "Health Check" → Verify server is running
#    - Send "Start Polling Job" → Get jobId
#    - Send "Get Job Status" → Monitor progress
#    - Check your Google Sheet → See rows being updated

# 3. Add more rows to your sheet while job is running
#    - Send "Get Job Status" again → See pending count increase
#    - Watch as new rows are processed automatically
```

---

## Collection Features

✅ **Auto-save jobId** - The "Start Polling Job" request automatically saves the jobId  
✅ **Environment variables** - Easy switching between local and production  
✅ **Pre-configured requests** - All endpoints ready to use  
✅ **Descriptive names** - Clear request names and descriptions  
✅ **Test scripts** - Automatic variable extraction  

Enjoy testing! 🚀
