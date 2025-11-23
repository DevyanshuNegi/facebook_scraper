# Docker Testing Guide

This guide explains how to build, test, and run the Facebook Scraper API using Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- Valid `.env` file with required credentials (see `.env.example`)

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 2. Build and Run with Docker Directly

```bash
# Build the image
docker build -t facebook-scraper-api .

# Run the container
docker run -d \
  --name scraper-api \
  -p 3000:3000 \
  --env-file .env \
  facebook-scraper-api

# View logs
docker logs -f scraper-api

# Stop and remove
docker stop scraper-api
docker rm scraper-api
```

## Testing the API

### 1. Health Check

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 42.5,
#   "activeJobs": 0,
#   "timestamp": "2025-11-23T..."
# }
```

### 2. API Documentation

```bash
# View available endpoints
curl http://localhost:3000/

# Expected response:
# {
#   "name": "Facebook Scraper API",
#   "version": "1.0.0",
#   "endpoints": {...}
# }
```

### 3. Start a Scraping Job

```bash
# Start a polling job for your Google Sheet
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "YOUR_GOOGLE_SHEET_ID"}'

# Expected response:
# {
#   "jobId": "uuid-here",
#   "sheetId": "YOUR_GOOGLE_SHEET_ID",
#   "status": "started",
#   "message": "Polling job started successfully"
# }
```

### 4. Check Job Status

```bash
# Get status of a specific job
curl http://localhost:3000/api/status/YOUR_JOB_ID

# List all jobs
curl http://localhost:3000/api/jobs
```

### 5. Stop a Job

```bash
# Stop a running job
curl -X POST http://localhost:3000/api/stop/YOUR_JOB_ID
```

## Docker Container Management

### View Container Status

```bash
# With docker-compose
docker-compose ps

# With docker
docker ps
docker stats scraper-api
```

### Check Container Health

```bash
# View health status
docker inspect --format='{{json .State.Health}}' scraper-api | jq

# Expected healthy status:
# {
#   "Status": "healthy",
#   "FailingStreak": 0,
#   "Log": [...]
# }
```

### View Logs

```bash
# With docker-compose
docker-compose logs -f scraper-api

# With docker
docker logs -f scraper-api

# View last 100 lines
docker logs --tail 100 scraper-api
```

### Execute Commands in Container

```bash
# Open shell in running container
docker exec -it scraper-api /bin/bash

# Run Node.js REPL
docker exec -it scraper-api node

# Test cookies setup
docker exec -it scraper-api node src/test_cookies.js
```

## Troubleshooting

### Container Won't Start

1. **Check environment variables:**
   ```bash
   docker-compose config
   ```

2. **View build logs:**
   ```bash
   docker-compose up --build
   ```

3. **Check for port conflicts:**
   ```bash
   # See what's using port 3000
   lsof -i :3000
   # Or use different port
   docker run -p 3001:3000 ...
   ```

### Health Check Failing

1. **View health check logs:**
   ```bash
   docker inspect scraper-api | grep -A 10 Health
   ```

2. **Check if server is responding:**
   ```bash
   docker exec scraper-api curl http://localhost:3000/health
   ```

### Playwright/Browser Issues

1. **Check Playwright installation:**
   ```bash
   docker exec scraper-api npx playwright --version
   ```

2. **Verify browsers are installed:**
   ```bash
   docker exec scraper-api ls -la /ms-playwright
   ```

### Google Sheets Connection Issues

1. **Verify service account credentials:**
   ```bash
   # Check if GOOGLE_PRIVATE_KEY is set (should show masked value)
   docker exec scraper-api printenv GOOGLE_SERVICE_ACCOUNT_EMAIL
   ```

2. **Test sheet access:**
   ```bash
   docker exec scraper-api node src/test_sheet_structure.js
   ```

### Facebook Cookie Issues

1. **Test cookies:**
   ```bash
   docker exec scraper-api node src/test_cookies.js
   ```

2. **Check cookie format:**
   - Ensure `FACEBOOK_COOKIES` is valid JSON
   - Verify cookies haven't expired
   - See `FACEBOOK_COOKIES_SETUP.md` for details

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Copy example file
cp .env.example .env

# Edit with your credentials
nano .env  # or vim, code, etc.
```

Required variables:
- `PORT` - API server port (default: 3000)
- `POLLING_INTERVAL_MS` - Sheet polling interval (default: 12000)
- `PARALLEL_BATCH_SIZE` - Concurrent URLs to process (default: 5)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Google service account email
- `GOOGLE_PRIVATE_KEY` - Google service account private key
- `FACEBOOK_COOKIES` - Facebook session cookies (JSON array)

## Production Deployment

### Build for Production

```bash
# Build with specific tag
docker build -t facebook-scraper-api:v1.0.0 .

# Multi-platform build (for ARM/AMD)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t facebook-scraper-api:v1.0.0 .
```

> **Note**: The Dockerfile uses `mcr.microsoft.com/playwright:v1.40.0-jammy` as the base image, which already includes Playwright browsers pre-installed. This eliminates the need to download browsers during build, reducing build time from 25+ minutes to under 1 minute for code changes.

### Push to Registry

```bash
# Tag for registry
docker tag facebook-scraper-api:v1.0.0 \
  your-registry.com/facebook-scraper-api:v1.0.0

# Push to registry
docker push your-registry.com/facebook-scraper-api:v1.0.0
```

### Railway Deployment

For Railway deployment, see `RAILWAY_DEPLOYMENT.md`.

## Performance Monitoring

### Container Resource Usage

```bash
# Real-time stats
docker stats scraper-api

# One-time snapshot
docker stats --no-stream scraper-api
```

### Application Metrics

```bash
# Check active jobs
curl http://localhost:3000/api/jobs | jq '.count'

# Monitor uptime
watch -n 5 'curl -s http://localhost:3000/health | jq .uptime'
```

## Best Practices

1. **Always use `.env` file** - Don't hardcode credentials
2. **Monitor logs** - Check logs regularly for errors
3. **Health checks** - Ensure health endpoint is accessible
4. **Resource limits** - Set memory/CPU limits in production
5. **Volume mounts** - Use volumes for persistent data
6. **Graceful shutdown** - Container handles SIGTERM properly

## Common Commands Cheat Sheet

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop and remove
docker-compose down

# Remove volumes too
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache

# Scale (if needed)
docker-compose up -d --scale scraper-api=2
```

## Additional Resources

- [Dockerfile](./Dockerfile) - Container image definition
- [docker-compose.yml](./docker-compose.yml) - Local development setup
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - Initial setup guide
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Cloud deployment
