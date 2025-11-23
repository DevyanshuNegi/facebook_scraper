# Railway Deployment - Step-by-Step Instructions

## ✅ Completed Steps

1. **Git Repository** - Initialized and committed ✓
2. **Railway CLI** - Installed successfully ✓
3. **Docker Image** - Tested locally and working ✓

---

## 🚀 Next Steps - Follow These Commands

### Step 1: Login to Railway

**Run this command:**
```bash
railway login
```

**What happens:**
- Opens browser for authentication
- Login with your GitHub account (or create new account)
- Grants Railway access

**After login:** Terminal will show "Logged in as [your-username]"

---

### Step 2: Initialize Railway Project

**Run this command:**
```bash
railway init
```

**You'll be prompted:**
- "Create new project or link existing?" → Choose "Create new project"
- "Project name?" → Enter: `facebook-scraper-api` (or your preferred name)
- "Environment?" → Select "production"

**What this does:**
- Creates new project on Railway
- Links your local directory to Railway project
- Creates `.railway` folder (already in .gitignore)

---

### Step 3: Set Environment Variables

**IMPORTANT:** You need to set these environment variables from your `.env` file:

**Run these commands ONE BY ONE:**

```bash
# Set PORT
railway variables set PORT=3000

# Set polling interval
railway variables set POLLING_INTERVAL_MS=12000

# Set batch size
railway variables set PARALLEL_BATCH_SIZE=5

# Set Google credentials
railway variables set GOOGLE_SERVICE_ACCOUNT_EMAIL="your-email@project.iam.gserviceaccount.com"

# Set Google private key (IMPORTANT: include the quotes)
railway variables set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_FULL_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----"

# Set Facebook cookies (IMPORTANT: must be valid JSON)
railway variables set FACEBOOK_COOKIES='[{"name":"c_user","value":"...","domain":".facebook.com"}]'
```

**OR use the Railway Dashboard:**
1. Go to https://railway.app
2. Open your project
3. Click "Variables" tab
4. Click "Raw Editor"
5. Paste your variables (copy from .env)
6. Click "Update Variables"

---

### Step 4: Deploy to Railway

**Run this command:**
```bash
railway up
```

**What happens:**
- Uploads your code to Railway
- Builds Docker image using your Dockerfile
- Starts the container
- Shows deployment logs in real-time

**Expected output:**
```
Building...
=> [1/5] FROM mcr.microsoft.com/playwright:v1.56.1-jammy
=> [2/5] WORKDIR /app  
=> [3/5] COPY package*.json ./
=> [4/5] RUN npm ci --only=production
=> [5/5] COPY . .
Deployment successful!
```

---

### Step 5: Generate Public URL

**Run this command:**
```bash
railway domain
```

**This generates a public URL like:**
```
your-app-production-a1b2.up.railway.app
```

**Save this URL!** You'll use it to access your API.

---

### Step 6: View Logs

**Run this command:**
```bash
railway logs
```

**You should see:**
```
[INFO] 🚀 Starting Facebook Scraper API...
[INFO] 🚀 API server running on port 3000
[INFO] 📊 Health check: http://localhost:3000/health
[INFO] 📝 API docs: http://localhost:3000/
```

---

## 🧪 Testing Your Deployment

### Test 1: Health Check

```bash
curl https://YOUR_APP_URL.up.railway.app/health
```

**Expected:**
```json
{
  "status": "ok",
  "uptime": 42.5,
  "activeJobs": 0,
  "timestamp": "2025-11-23T..."
}
```

### Test 2: API Documentation

```bash
curl https://YOUR_APP_URL.up.railway.app/
```

### Test 3: Start Scraping Job

```bash
curl -X POST https://YOUR_APP_URL.up.railway.app/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "YOUR_GOOGLE_SHEET_ID"}'
```

---

## 🔧 Useful Railway Commands

```bash
# View project status
railway status

# Open project in browser
railway open

# Restart service
railway restart

# Add more variables
railway variables set KEY=VALUE

# View all variables
railway variables

# Redeploy
railway up --detach
```

---

## ⚠️ Troubleshooting

### Issue: Build fails

**Check:**
```bash
railway logs --deployment
```

**Common fixes:**
- Verify Dockerfile syntax
- Check package.json dependencies
- Ensure all files are committed to git

### Issue: Container crashes

**Check environment variables:**
```bash
railway variables
```

**Ensure:**
- `GOOGLE_PRIVATE_KEY` has proper newlines (`\n`)
- `FACEBOOK_COOKIES` is valid JSON
- All required variables are set

### Issue: "Railway login failed"

**Fix:**
-Clear Railway config: `rm -rf ~/.railway`
- Try again: `railway login`

---

## 📊 Monitoring

**View real-time logs:**
```bash
railway logs --follow
```

**View metrics in Dashboard:**
1. Go to https://railway.app
2. Open your project
3. Click "Metrics" tab
4. Monitor:
   - CPU usage
   - Memory usage
   - Network traffic

---

## 💰 Cost Estimate

Railway charges based on usage:
- **Free tier:** $5 credit/month
- **Typical cost:** $10-20/month for continuous service
- **Pay-as-you-go:** ~$0.50/hour when active

**Tip:** Service auto-sleeps when idle to save costs!

---

## ✅ Success Checklist

- [ ] Railway login successful
- [ ] Project initialized
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Public URL generated
- [ ] Health endpoint returns 200
- [ ] API documentation accessible
- [ ] Can start scraping jobs

---

## 🎉 You're Ready!

Once all steps are complete, your API will be live at:
```
https://your-app-production.up.railway.app
```

Use this URL to:
- Start polling jobs
- Check job status
- Monitor scraping progress
- Access from anywhere!
