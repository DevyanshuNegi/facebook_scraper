# Railway Environment Variables Setup

## 🚨 Quick Fix - Set Variables via Dashboard (Easiest Method)

### Step 1: Open Railway Dashboard

Go to: **https://railway.app/project/834be419-22d6-4790-ba75-3e3641e0da4f**

(This is your project URL from the deployment logs)

### Step 2: Navigate to Variables

1. Click on your service: **negi-scrapper**
2. Click on the **"Variables"** tab
3. Click **"Raw Editor"** button

### Step 3: Copy Your Environment Variables

From your local `.env` file, copy these variables:

```bash
PORT=3000
POLLING_INTERVAL_MS=12000
PARALLEL_BATCH_SIZE=5
GOOGLE_SERVICE_ACCOUNT_EMAIL=<your_email_from_.env>
GOOGLE_PRIVATE_KEY=<your_private_key_from_.env>
FACEBOOK_COOKIES=<your_cookies_from_.env>
```

**IMPORTANT:** Make sure to copy the EXACT values from your `.env` file, including:
- Full private key with BEGIN/END lines
- Complete Facebook cookies JSON array

### Step 4: Paste and Save

1. Paste all variables in the Raw Editor
2. Click **"Update Variables"**
3. Railway will automatically redeploy your service

---

## Alternative: Set via CLI

### Link to Service First

```bash
cd /home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp

# Link to your service
railway link 834be419-22d6-4790-ba75-3e3641e0da4f

# Or let Railway detect the service
railway service
# Then select: negi-scrapper
```

### Set Variables via CLI

Create a script to set all variables:

```bash
# Extract from .env and set each variable
source .env

# Set variables
railway variables set PORT=3000
railway variables set POLLING_INTERVAL_MS=12000
railway variables set PARALLEL_BATCH_SIZE=5
railway variables set GOOGLE_SERVICE_ACCOUNT_EMAIL="$GOOGLE_SERVICE_ACCOUNT_EMAIL"
railway variables set GOOGLE_PRIVATE_KEY="$GOOGLE_PRIVATE_KEY"
railway variables set FACEBOOK_COOKIES="$FACEBOOK_COOKIES"
```

### Redeploy After Setting Variables

```bash
railway up --detach
```

---

## ✅ Verification

After setting variables, check the logs:

```bash
railway logs
```

**You should see:**
```
[INFO] 🚀 Starting Facebook Scraper API...
[INFO] Loaded 1 cookie sessions.  <-- This means cookies are loaded!
[INFO] Launching Persistent Browser...
```

**You should NOT see:**
```
[INFO] No FACEBOOK_COOKIES found in environment.
[ERROR] Missing Google Sheets credentials
```

---

## 🔍 Check Current Variables

```bash
# After linking service
railway variables
```

This shows all currently set variables.

---

## Common Issues

### Issue: Private key not working

**Problem:** Multi-line private key gets corrupted

**Fix:** In Railway dashboard, ensure the private key looks like:
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoI...
... (multiple lines) ...
-----END PRIVATE KEY-----
```

### Issue: Facebook cookies not parsed

**Problem:** JSON format is incorrect

**Fix:** Ensure it's a valid JSON array:
```json
[{"name":"c_user","value":"123456","domain":".facebook.com","path":"/"}]
```

---

## 📊 Expected Behavior After Fix

1. Service redeploys automatically when variables are saved
2. Health check passes
3. Logs show proper initialization
4. Can start scraping jobs successfully

---

## Quick Visual Guide

**Railway Dashboard Flow:**
```
1. railway.app
   ↓
2. Your Project → negi-scrapper
   ↓
3. Variables Tab
   ↓
4. Raw Editor
   ↓  
5. Paste variables → Update Variables
   ↓
6. Auto-redeploy starts
```

**Timeline:**
- Variables saved: Instant
- Redeploy triggered: ~5 seconds  
- Build completes: ~1 minute
- Service ready: ~1.5 minutes total
