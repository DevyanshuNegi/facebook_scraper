# Ingestor Service

Automatically monitors Google Sheets and adds pending rows to the scrape queue.

## Features

- **Automatic Polling**: Checks Google Sheets every 60 seconds for new rows
- **Deduplication**: Skips URLs already in queue
- **Batch Processing**: Limits to 100 rows per poll to avoid overwhelming system
- **Job Cleanup**: Auto-removes old completed/failed jobs to save memory

## Configuration

Environment variables:

```env
# Required
GOOGLE_SHEET_ID=your_sheet_id_here

# Optional
INGESTOR_POLL_INTERVAL_MS=60000    # Poll every 60 seconds (default)
INGESTOR_BATCH_SIZE=100            # Max rows per poll (default)
```

## Usage

### Run as Part of Full System
```bash
npm run dev
# Starts: API + Worker + Syncer + Ingestor
```

### Run Standalone
```bash
# With GOOGLE_SHEET_ID in .env
npm run ingestor

# Or specify sheet ID
node src/services/ingestor/index.js 1ABC123xyz
```

## How It Works

1. **Poll**: Every 60s, reads pending rows from Google Sheets
2. **Filter**: Only processes rows with empty `status` column
3. **Add to Queue**: Pushes URLs to `scrape-queue`
4. **Deduplicate**: Skips URLs already in queue (same jobId)
5. **Cleanup**: Removes old completed jobs (keeps last 1000)

## Benefits

- ✅ **No manual API calls** - Just add URLs to sheet
- ✅ **Automatic processing** - New rows are detected and scraped
- ✅ **Memory efficient** - Old jobs are auto-cleaned
- ✅ **No duplicates** - Same URL won't be queued twice

## Example Workflow

```
1. Add 800 URLs to Google Sheet (status column empty)
2. Ingestor detects them in next poll (60s)
3. Adds 100 URLs to queue (batch 1)
4. Next poll (60s later): Adds next 100 (batch 2)
5. Continues until all 800 are queued
6. Workers process them in parallel
7. Syncer writes results back to sheet
```

## Logs

```
[Ingestor] Polling sheet 1ABC123xyz for pending rows...
[Ingestor] Found 100 pending rows, adding to queue...
[Ingestor] ✅ Added 98 new jobs to queue (2 were duplicates)
```

## Monitoring

Check Bull Board: `http://localhost:3000/admin/queues`

- View jobs added by Ingestor
- Monitor queue depth
- See completion rate
