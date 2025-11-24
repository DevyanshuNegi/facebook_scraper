# Google Service Account Setup Guide

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name (e.g., "Facebook Scraper")
4. Click **Create**

---

## Step 2: Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and click **Enable**

---

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in details:
   - **Service account name**: `facebook-scraper`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for Facebook scraper to access Google Sheets"
4. Click **Create and Continue**
5. Skip "Grant this service account access to project" (optional)
6. Click **Done**

---

## Step 4: Create Service Account Key

1. In **Credentials** page, find your service account
2. Click on the service account email
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. A JSON file will be downloaded (keep it safe!)

---

## Step 5: Extract Credentials from JSON

Open the downloaded JSON file. You'll see something like:

```json
{
  "type": "service_account",
  "project_id": "your-project-123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "facebook-scraper@your-project-123.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**Extract these two values**:

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**:
   ```
   facebook-scraper@your-project-123.iam.gserviceaccount.com
   ```

2. **GOOGLE_PRIVATE_KEY**:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBg...
   -----END PRIVATE KEY-----
   ```

   **Important**: Keep the `\n` characters in the private key!

---

## Step 6: Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click **Share** button (top right)
3. Paste the service account email:
   ```
   facebook-scraper@your-project-123.iam.gserviceaccount.com
   ```
4. Set permission to **Editor**
5. Uncheck "Notify people"
6. Click **Share**

**Why?** The service account needs permission to read and write to your sheet.

---

## Step 7: Add to .env File

```bash
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=facebook-scraper@your-project-123.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**Important Notes**:
- Wrap the private key in quotes
- Keep the `\n` characters (they represent newlines)
- Don't commit this file to Git!

---

## Step 8: Add to Railway (Production)

1. Go to your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Add two variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: (paste the email)
   - `GOOGLE_PRIVATE_KEY`: (paste the entire private key with `\n`)

---

## Troubleshooting

### Error: "Missing Google Sheets credentials"
- Check that both `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are set
- Verify the private key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Error: "The caller does not have permission"
- Make sure you shared the Google Sheet with the service account email
- The service account needs **Editor** permission

### Error: "Invalid grant"
- The private key might be malformed
- Re-download the JSON key and extract again
- Make sure `\n` characters are preserved

---

## Security Best Practices

✅ **Never commit credentials to Git**
- Add `.env` to `.gitignore` (already done)
- Use Railway environment variables for production

✅ **Rotate keys periodically**
- Delete old keys in Google Cloud Console
- Create new keys every 90 days

✅ **Limit service account permissions**
- Only enable Google Sheets API
- Don't grant unnecessary project permissions

✅ **Use separate service accounts**
- Development: One service account
- Production: Different service account
