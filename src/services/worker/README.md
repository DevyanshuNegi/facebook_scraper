# Worker Service

Consumes scraping jobs from the `scrape-queue` and processes them.

## Architecture

```
scrape-queue → Worker → Scraper → results-queue
```

**Worker does NOT write to Google Sheets directly** - this prevents API rate limits.

## Features

- **Persistent Browser**: Reuses browser instance for performance
- **Parallel Processing**: Configurable concurrency (default: 3)
- **Resource Blocking**: Blocks images/media/fonts for speed
- **Cookie Support**: Uses FACEBOOK_COOKIES from .env
- **Rate Limiting**: Max 10 jobs/second
- **Graceful Shutdown**: Closes browser cleanly

## Usage

### Start Worker
```bash
npm run worker
```

### Run with API
```bash
npm run dev  # Runs API + Worker concurrently
```

### Environment Variables
```bash
WORKER_CONCURRENCY=3  # Number of parallel jobs
REDIS_HOST=localhost
REDIS_PORT=6379
FACEBOOK_COOKIES='[...]'  # FB authentication
```

## Testing

```bash
# Terminal 1: Start worker
npm run worker

# Terminal 2: Run test
node src/tests/test-worker.js
```

## Job Flow

1. **Job arrives** from `scrape-queue`
2. **Browser scrapes** Facebook URL
3. **Email extracted** (or "Not found")
4. **Result pushed** to `results-queue`
5. **Job marked complete**

## Concurrency

By default, processes **3 URLs in parallel**. Adjust via:

```bash
WORKER_CONCURRENCY=5 npm run worker
```

## Error Handling

- **Failed scrapes**: Retries 3x with exponential backoff
- **Browser crashes**: Reinitializes on next job
- **Network errors**: Marked as "Failed", queued for retry

## Next: Syncer Service

Worker pushes to `results-queue`. Build a **Syncer** service to:
1. Consume from `results-queue`
2. Batch results (50 items or 30s)
3. Write to Google Sheets in one API call
