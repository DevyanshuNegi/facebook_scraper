# Railway Google Sheets "Not Found" Troubleshooting

## Common Causes & Solutions

### Issue 1: Google Sheets API Not Enabled

**Symptom:** "Row X not found" errors

**Cause:** Google Sheets API might not be enabled for your service account

**Solution:**
1. Go to https://console.cloud.google.com
2. Select your project: `fbscrapper-479109`
3. Go to "APIs & Services" → "Library"
4. Search for "Google Sheets API"
5. Click "Enable" if not already enabled

---

### Issue 2: Service Account Permissions

**Symptom:** Authentication errors or "not found" on existing sheets

**Cause:** Service account doesn't have access to the Google Sheet

**Solution:**
1. Open your Google Sheet
2. Click "Share" button
3. Add your service account email: `devyanshu-negi@fbscrapper-479109.iam.gserviceaccount.com`
4. Give "Editor" access
5. Click "Send"

---

### Issue 3: Private Key Format

**Symptom:** Authentication fails silently

**Cause:** Private key has incorrect escaping in Railway

**Check your Railway variables:**

**GOOGLE_PRIVATE_KEY should look like:**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAAS...
(multiple lines)
...
-----END PRIVATE KEY-----
```

**Common mistakes:**
- ❌ Missing `\n` newlines
- ❌ Extra quotes
- ❌ Truncated key

**Fix:**
In Railway dashboard, Raw Editor, paste exactly as it appears in your `.env` file:
```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"
```

---

### Issue 4: Row Index Mismatch

**Symptom:** "Row 28 not found" but row exists

**Cause:** API version difference (v3 vs v5) or 0-indexing vs 1-indexing

**Check:**
```javascript
// In sheets.js, verify row indexing:
const row = rows[rowIndex - 2]; // Adjust for header row
```

**Debug by adding logs:**
```javascript
console.log('Total rows:', rows.length);
console.log('Looking for row index:', rowIndex);
console.log('Actual array index:', rowIndex - 2);
```

---

### Issue 5: Sheet Structure Changed

**Symptom:** Cannot find rows that exist

**Cause:** Sheet headers or structure don't match expected format

**Verify sheet structure:**
Required columns (case-sensitive):
- `url`
- `email`
- `status`

**Check in Railway logs:**
```bash
railway logs | grep "Found.*pending rows"
```

Should show: `Found X pending rows in sheet...`

---

## Quick Diagnostic Commands

### 1. Check Railway logs
```bash
# View recent logs
railway logs --tail 100

# Follow logs in real-time
railway logs --follow

# Filter for errors
railway logs | grep ERROR
```

### 2. Check environment variables
```bash
# View all variables
railway variables

# Check specific variable
railway variables | grep GOOGLE
```

### 3. Test Google Sheets connection locally

Run this test script:
```bash
cd /home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp
node src/test_sheet_structure.js
```

This validates:
- ✅ Service account credentials
- ✅ Sheet access
- ✅ Sheet structure
- ✅ Row reading

---

## Step-by-Step Debug Process

### Step 1: Verify Environment Variables in Railway

Go to Railway dashboard → Variables → Check:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=devyanshu-negi@fbscrapper-479109.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

### Step 2: Check Railway Deployment Logs

Look for these messages:
```
✅ GOOD: [INFO] Started polling sheet 1YAygrRdhECS78tt71I23rqgak-7BvEpEvU22QD7ZzPg
✅ GOOD: [INFO] Found 5 pending rows in sheet

❌ BAD: [ERROR] Missing Google Sheets credentials
❌ BAD: [ERROR] Failed to get pending rows
❌ BAD: [ERROR] Row 28 not found
```

### Step 3: Test Locally First

```bash
# Stop docker-compose if running
docker-compose down

# Run API locally
node src/index.js

# In another terminal, test
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "1YAygrRdhECS78tt71I23rqgak-7BvEpEvU22QD7ZzPg"}'
```

If it works locally but not on Railway → Environment variable issue
If it fails locally too → Google Sheets permission/API issue

### Step 4: Check Google Sheet Access

1. Open sheet: https://docs.google.com/spreadsheets/d/1YAygrRdhECS78tt71I23rqgak-7BvEpEvU22QD7ZzPg
2. Click Share
3. Verify `devyanshu-negi@fbscrapper-479109.iam.gserviceaccount.com` has Editor access
4. If not, add it

### Step 5: Verify Sheet Structure

Sheet must have these exact columns in row 1:
```
| url | email | status |
```

Check:
- No extra spaces in column names
- Headers in row 1
- Data starts from row 2

---

## Most Likely Cause

Based on the error "not found in the sheet," the most likely issues are:

1. **Service account not shared with sheet** (80% of cases)
   - Fix: Share sheet with service account email
   
2. **Private key not set correctly in Railway** (15% of cases)
   - Fix: Copy-paste exact value from `.env`

3. **Row indexing bug** (5% of cases)
   - Check logs for actual error details

---

## Get More Details

**Share the exact error message:**
```bash
railway logs --tail 100 > railway_logs.txt
```

Then share the error lines that show:
- `[ERROR] Failed to...`
- `[ERROR] Row X not found`
- Stack traces

This will help identify the exact issue!

---

## Emergency Fix

If urgent, you can:

1. **Restart the service:**
   ```bash
   railway restart
   ```

2. **Redeploy:**
   ```bash
   railway up --detach
   ```

3. **Check health:**
   ```bash
   curl https://YOUR_APP.up.railway.app/health
   ```
