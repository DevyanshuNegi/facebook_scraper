# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Railway CLI** (optional): Install with `npm i -g @railway/cli`

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Create New Project on Railway**
   - Go to [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Dockerfile

3. **Configure Environment Variables**
   - Go to your project → Variables tab
   - Add the following variables:
     ```
     FACEBOOK_COOKIES=<your_cookies_json>
     NODE_ENV=production
     ```
   - **Important**: Copy your entire `FACEBOOK_COOKIES` value from `.env`

4. **Deploy**
   - Railway will automatically build and deploy
   - Monitor the build logs in the Deployments tab

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Add Environment Variables**
   ```bash
   railway variables set FACEBOOK_COOKIES="$(cat .env | grep FACEBOOK_COOKIES | cut -d '=' -f2-)"
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## Configuration Files

### Dockerfile
The `Dockerfile` is already configured with:
- Playwright-enabled Node.js base image
- Chromium browser installation
- Production dependencies
- Optimized for Railway's environment

### railway.json
Configures:
- Docker build settings
- Restart policy (on failure, max 3 retries)
- Single replica deployment

## Important Notes

### 1. Execution Model

The current setup runs `src/test_parallel.js` which:
- Processes all URLs from `sheet1.csv`
- Saves results to `scraped_results.csv`
- **Exits after completion**

**For Railway, you have two options:**

#### A. One-Time Job (Current Setup)
- Runs once and exits
- Good for: Manual triggers, scheduled jobs
- **Cost**: Only charged for execution time

#### B. Continuous Service (Requires Modification)
- Runs continuously, waiting for requests
- Good for: API endpoints, scheduled intervals
- **Cost**: Charged for uptime

### 2. Accessing Results

Since Railway is ephemeral, `scraped_results.csv` will be lost after deployment ends.

**Solutions:**

#### Option A: Upload to Cloud Storage
Add code to upload CSV to:
- AWS S3
- Google Cloud Storage
- Cloudflare R2

#### Option B: Send via Email
Add nodemailer to email the CSV after completion

#### Option C: Store in Database
Save results to PostgreSQL/MongoDB (Railway provides free databases)

### 3. Scheduling

To run the scraper on a schedule:

#### Using Railway Cron (Recommended)
1. Install Railway's cron plugin
2. Set schedule (e.g., daily at 2 AM)
3. Railway will trigger your service

#### Using GitHub Actions
```yaml
# .github/workflows/scrape.yml
name: Run Scraper
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install chromium
      - run: node src/test_parallel.js
        env:
          FACEBOOK_COOKIES: ${{ secrets.FACEBOOK_COOKIES }}
```

## Cost Estimation

Railway pricing (as of 2024):
- **Free tier**: $5 credit/month
- **Execution time**: ~10 minutes per run
- **Estimated cost**: $0.10-0.20 per run

For daily runs: ~$3-6/month

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Ensure all dependencies in package.json
- Verify Playwright version compatibility

### Runtime Errors
- Check environment variables are set
- Review deployment logs
- Ensure FACEBOOK_COOKIES format is correct

### Timeout Issues
- Railway has 30-minute timeout for builds
- For long-running scrapes, consider splitting into batches

## Next Steps

1. **Test Locally First**
   ```bash
   docker build -t scraper .
   docker run -e FACEBOOK_COOKIES="$(cat .env | grep FACEBOOK_COOKIES | cut -d '=' -f2-)" scraper
   ```

2. **Deploy to Railway**
   - Follow Option 1 or Option 2 above

3. **Monitor First Run**
   - Watch deployment logs
   - Verify CSV is generated
   - Check for errors

4. **Set Up Result Storage**
   - Choose cloud storage or database
   - Modify code to save results

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Playwright Docker Guide](https://playwright.dev/docs/docker)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify environment variables
3. Test Docker image locally first
4. Review Playwright browser installation
