# Syncer Service

Consumes results from the `results-queue` and batch-writes to Google Sheets.

## Architecture

```
results-queue → Syncer (buffer) → Google Sheets (batched)
```

**Syncer protects Google Sheets API** by batching writes.

## Features

- **Buffering**: Accumulates results in memory
- **Batch Writing**: Writes 50 items at once (or after 30s)
- **Rate Limit Protection**: Prevents hitting Google API limits
- **Multi-Sheet Support**: Handles multiple sheets simultaneously
- **Graceful Shutdown**: Flushes buffer before exit

## Usage

### Start Syncer
```bash
npm run syncer
```

### Run All Services
```bash
npm run dev  # API + Worker + Syncer
```

### Environment Variables
```bash
SYNC_BUFFER_SIZE=50              # Items to buffer before flush
SYNC_FLUSH_INTERVAL_MS=30000     # Max time between flushes (30s)
GOOGLE_SERVICE_ACCOUNT_EMAIL=... # Required
GOOGLE_PRIVATE_KEY=...           # Required
```

## How It Works

### 1. Buffering
```
Result 1 → Buffer
Result 2 → Buffer
...
Result 50 → Buffer FULL → FLUSH to Sheets
```

### 2. Time-Based Flush
```
Result 1 → Buffer
[30 seconds pass]
FLUSH to Sheets (even if <50 items)
```

### 3. Multi-Sheet
```
Buffer:
{
  "sheet-A": [result1, result2, ...],
  "sheet-B": [result3, result4, ...]
}
```

Flushes all sheets together.

## Buffer Logic

**Triggers flush when:**
- Buffer reaches 50 items (configurable), OR
- 30 seconds since last flush (configurable)

**Why?**
- Google Sheets API: ~100 writes/min limit
- 1 batch write of 50 >> 50 individual writes
- Reduces API calls by 50x

## Testing

```bash
# Terminal 1: Start syncer
npm run syncer

# Terminal 2: Add jobs
curl -X POST http://localhost:3000/api/start-queue \
  -d '{"sheetId":"YOUR_SHEET_ID","urls":["url1","url2",...]}'

# Terminal 3: Monitor
open http://localhost:3000/admin/queues
```

## Error Handling

- **Failed writes**: Job retries 5x (configured in resultsQueue)
- **Auth errors**: Logs error, continues with other sheets
- **Network errors**: Retries with exponential backoff

## Performance

| Metric | Individual Writes | Batched (Syncer) |
|--------|-------------------|------------------|
| **API Calls** | 50 calls | 1 call |
| **Time** | ~50 seconds | ~2 seconds |
| **Rate Limit Risk** | High | Low |
| **Cost** | Higher | Lower |

## Complete Flow

```
1. API receives URLs
2. Pushes to scrape-queue
3. Worker scrapes → pushes to results-queue
4. Syncer buffers results
5. When buffer full OR 30s timeout:
   → Batch write to Google Sheets
```

## Graceful Shutdown

When you stop the syncer (Ctrl+C):
1. Stops accepting new jobs
2. Flushes all buffered results
3. Closes connections
4. Exits cleanly

**No data loss!**
