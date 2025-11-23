# Complete Setup Checklist

Follow this checklist to get your Facebook scraper up and running.

---

## Prerequisites

- [ ] Node.js installed (v16 or higher)
- [ ] Google account
- [ ] Facebook account (preferably a dedicated one for scraping)
- [ ] Railway account (for deployment)

---

## 1. Google Service Account Setup

**Time**: ~10 minutes

- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Create Service Account
- [ ] Download JSON key file
- [ ] Extract `GOOGLE_SERVICE_ACCOUNT_EMAIL` from JSON
- [ ] Extract `GOOGLE_PRIVATE_KEY` from JSON

📖 **Detailed Guide**: [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md)

---

## 2. Facebook Cookies Extraction

**Time**: ~5 minutes

Choose one method:

### Option A: Browser Extension (Easiest)
- [ ] Install Cookie-Editor extension
- [ ] Login to Facebook
- [ ] Export cookies as JSON
- [ ] Copy to `.env` file

### Option B: DevTools (Manual)
- [ ] Login to Facebook
- [ ] Open Chrome DevTools (F12)
- [ ] Go to Application → Cookies
- [ ] Copy important cookies (`c_user`, `xs`, `datr`, `sb`)
- [ ] Format as JSON array

### Option C: Test Script (Automated)
- [ ] Run `node src/test_cookies.js`
- [ ] Login when browser opens
- [ ] Copy from `cookies.json` to `.env`

📖 **Detailed Guide**: [FACEBOOK_COOKIES_SETUP.md](./FACEBOOK_COOKIES_SETUP.md)

---

## 3. Google Sheet Preparation

**Time**: ~2 minutes

- [ ] Create a new Google Sheet
- [ ] Add column headers: `url`, `email`, `status`
- [ ] Share sheet with service account email (Editor permission)
- [ ] Copy the Sheet ID from URL
- [ ] Add some test Facebook profile URLs in column A

**Sheet ID Location**:
```
https://docs.google.com/spreadsheets/d/1ABC123xyz456/edit
                                      ^^^^^^^^^^^^
                                      This is your Sheet ID
```

---

## 4. Local Environment Setup

**Time**: ~5 minutes

- [ ] Clone/download the project
- [ ] Install dependencies: `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in environment variables:

```bash
# Server Configuration
PORT=3000

# Polling Configuration
POLLING_INTERVAL_MS=12000
PARALLEL_BATCH_SIZE=5

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Facebook Cookies
FACEBOOK_COOKIES=[{"name":"c_user","value":"..."}]
```

---

## 5. Local Testing

**Time**: ~10 minutes

### Start the Server
```bash
node src/index.js
```

Expected output:
```
[INFO] 🚀 Starting Facebook Scraper API...
[INFO] 🚀 API server running on port 3000
[INFO] 📊 Health check: http://localhost:3000/health
```

### Test with Postman

- [ ] Import `postman_collection.json` to Postman
- [ ] Set `sheetId` variable to your Google Sheet ID
- [ ] Send "Health Check" request → Should return `{"status": "ok"}`
- [ ] Send "Start Polling Job" request → Should return `jobId`
- [ ] Send "Get Job Status" request → Should show stats
- [ ] Check your Google Sheet → Rows should be updating

📖 **Detailed Guide**: [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)

### Test with cURL

```bash
# Health check
curl http://localhost:3000/health

# Start job
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "YOUR_SHEET_ID"}'

# Get status (replace JOB_ID)
curl http://localhost:3000/api/status/JOB_ID
```

---

## 6. Railway Deployment

**Time**: ~15 minutes

### Prepare Repository
- [ ] Initialize git: `git init`
- [ ] Add files: `git add .`
- [ ] Commit: `git commit -m "Initial commit"`
- [ ] Push to GitHub

### Deploy to Railway
- [ ] Go to [Railway](https://railway.app/)
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Add environment variables:
  - `PORT` = 3000
  - `POLLING_INTERVAL_MS` = 12000
  - `PARALLEL_BATCH_SIZE` = 5
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = (your service account email)
  - `GOOGLE_PRIVATE_KEY` = (your private key with \n)
  - `FACEBOOK_COOKIES` = (your cookies JSON)
- [ ] Deploy

### Verify Deployment
- [ ] Check Railway logs for successful startup
- [ ] Test health endpoint: `curl https://your-app.railway.app/health`
- [ ] Test API with Postman (update `baseUrl` to Railway URL)

📖 **Detailed Guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

---

## 7. Production Testing

**Time**: ~10 minutes

- [ ] Update Postman `baseUrl` to Railway URL
- [ ] Prepare production Google Sheet with real URLs
- [ ] Start a job via API
- [ ] Monitor progress via `/api/status/:jobId`
- [ ] Verify Google Sheet is being updated
- [ ] Check Railway logs for errors

---

## Troubleshooting

### Server won't start
- Check all environment variables are set
- Verify Google private key format (includes `\n`)
- Check port 3000 is not already in use

### "Missing Google Sheets credentials"
- Verify `GOOGLE_SERVICE_ACCOUNT_EMAIL` is set
- Verify `GOOGLE_PRIVATE_KEY` is set and properly formatted
- Check the private key includes BEGIN/END markers

### "The caller does not have permission"
- Share the Google Sheet with the service account email
- Grant "Editor" permission
- Wait a few minutes for permissions to propagate

### "Detected login redirect"
- Facebook cookies are expired or invalid
- Re-extract cookies from a fresh login
- Make sure you copied ALL cookies, not just c_user
- Try using cookie rotation with multiple accounts

### Job status shows "Failed" rows
- Check Railway logs for specific error messages
- Verify Facebook URLs are valid
- Check if Facebook is blocking requests (rate limiting)
- Try reducing `PARALLEL_BATCH_SIZE` to 3

---

## Required Secrets Summary

| Secret | Where to Get | Required? |
|--------|--------------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud Console | ✅ Yes |
| `GOOGLE_PRIVATE_KEY` | Google Cloud Console (JSON key) | ✅ Yes |
| `FACEBOOK_COOKIES` | Browser cookies export | ✅ Yes |
| `PORT` | Set to 3000 | ⚠️ Railway auto-sets |
| `POLLING_INTERVAL_MS` | Default: 12000 | ❌ Optional |
| `PARALLEL_BATCH_SIZE` | Default: 5 | ❌ Optional |

---

## Redis? (Not Required)

**Q: Do we need Redis?**

**A: No, not for the current implementation.**

The current system uses **in-memory job management**, which is perfect for:
- Single Railway instance
- Moderate workload (hundreds to thousands of URLs)
- Simple setup with no external dependencies

**When to use Redis** (Future Phase 2):
- Scaling to 100k+ URLs
- Running multiple worker nodes
- Distributed processing across servers
- Persistent job queue across restarts

For now, the in-memory approach is simpler and sufficient for most use cases.

---

## Next Steps After Setup

1. **Monitor Performance**:
   - Watch Railway logs for errors
   - Monitor Google Sheets API quota
   - Track job completion rates

2. **Optimize Settings**:
   - Adjust `POLLING_INTERVAL_MS` based on workload
   - Tune `PARALLEL_BATCH_SIZE` for optimal speed
   - Add more cookie sessions for rotation

3. **Add Features** (Optional):
   - Authentication for API endpoints
   - Webhooks for job completion notifications
   - Database for persistent job history
   - Monitoring/alerting integration

---

## Support

- 📖 **API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 🧪 **Postman Guide**: [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)
- 🔐 **Google Setup**: [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md)
- 🍪 **Cookies Setup**: [FACEBOOK_COOKIES_SETUP.md](./FACEBOOK_COOKIES_SETUP.md)
- 🚂 **Railway Deployment**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

Good luck! 🚀
