# Facebook Cookies Setup Guide

## What Are Facebook Cookies?

Facebook cookies are authentication tokens that allow the scraper to access Facebook pages as if you're logged in. Without cookies, Facebook will redirect to the login page.

---

## Option 1: Extract Cookies from Browser (Recommended)

### Using Chrome Extension: "Cookie-Editor"

1. **Install Extension**:
   - Go to [Cookie-Editor Chrome Extension](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
   - Click **Add to Chrome**

2. **Login to Facebook**:
   - Open Facebook in Chrome
   - Login with your account
   - Navigate to any Facebook page

3. **Export Cookies**:
   - Click the Cookie-Editor extension icon
   - Click **Export** button (bottom right)
   - Select **JSON** format
   - Copy the JSON array

4. **Format for .env**:
   ```bash
   # Single session (one account)
   FACEBOOK_COOKIES=[{"name":"c_user","value":"123456","domain":".facebook.com",...}]
   
   # Multiple sessions (for rotation)
   FACEBOOK_COOKIES=[[{...session1...}],[{...session2...}]]
   ```

---

## Option 2: Extract Cookies Manually (Chrome DevTools)

1. **Login to Facebook**:
   - Open Facebook in Chrome
   - Login with your account

2. **Open DevTools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)

3. **Go to Application Tab**:
   - Click **Application** tab
   - Expand **Cookies** in left sidebar
   - Click on `https://www.facebook.com`

4. **Copy Important Cookies**:
   You need these cookies at minimum:
   - `c_user` - Your user ID
   - `xs` - Session token
   - `datr` - Device authentication
   - `sb` - Secure browsing token

5. **Format as JSON**:
   ```json
   [
     {
       "name": "c_user",
       "value": "100012345678901",
       "domain": ".facebook.com",
       "path": "/",
       "expires": -1,
       "httpOnly": false,
       "secure": true,
       "sameSite": "None"
     },
     {
       "name": "xs",
       "value": "12%3Aabcd1234...",
       "domain": ".facebook.com",
       "path": "/",
       "expires": -1,
       "httpOnly": true,
       "secure": true,
       "sameSite": "None"
     }
   ]
   ```

---

## Option 3: Use Test Script (Included)

We've included a test script to help you extract cookies:

```bash
# Run the cookie extraction script
node src/test_cookies.js
```

This will:
1. Open a browser window
2. Navigate to Facebook login
3. Wait for you to login manually
4. Extract all cookies
5. Save them to `cookies.json`

Then copy the contents to your `.env` file.

---

## Cookie Rotation (Multiple Accounts)

To avoid rate limiting, you can use multiple Facebook accounts:

```bash
FACEBOOK_COOKIES=[
  [
    {"name":"c_user","value":"account1_cookies",...}
  ],
  [
    {"name":"c_user","value":"account2_cookies",...}
  ],
  [
    {"name":"c_user","value":"account3_cookies",...}
  ]
]
```

The scraper will automatically rotate between sessions if one gets blocked.

---

## Important Cookie Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ Yes | Cookie name (e.g., "c_user") |
| `value` | ✅ Yes | Cookie value |
| `domain` | ✅ Yes | Usually ".facebook.com" |
| `path` | ✅ Yes | Usually "/" |
| `expires` | No | Set to -1 for session cookies |
| `httpOnly` | No | true/false |
| `secure` | No | Usually true for Facebook |
| `sameSite` | No | "None", "Lax", or "Strict" |

---

## Testing Your Cookies

Test if your cookies work:

```bash
# Start the server
node src/index.js

# In another terminal, start a test job
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "YOUR_SHEET_ID"}'

# Check logs for:
# ✅ "Injected cookies for session" - Cookies loaded successfully
# ❌ "Detected login redirect" - Cookies expired or invalid
```

---

## Troubleshooting

### "Detected login redirect or checkpoint"

**Cause**: Cookies are expired or invalid

**Solutions**:
1. Re-extract cookies from a fresh Facebook login
2. Make sure you copied ALL cookies (not just c_user)
3. Check that the account isn't locked or requiring verification

---

### "Failed to parse FACEBOOK_COOKIES"

**Cause**: JSON syntax error in .env file

**Solutions**:
1. Validate JSON at [jsonlint.com](https://jsonlint.com/)
2. Make sure quotes are properly escaped
3. Use single quotes around the entire value in .env:
   ```bash
   FACEBOOK_COOKIES='[{"name":"c_user",...}]'
   ```

---

### Cookies Keep Expiring

**Cause**: Facebook invalidates cookies after inactivity

**Solutions**:
1. Use "Remember Me" when logging in
2. Re-extract cookies weekly
3. Use multiple accounts for rotation
4. Keep a browser session open with the account

---

## Security Best Practices

⚠️ **Never share your cookies publicly**
- Cookies are equivalent to your password
- Anyone with your cookies can access your Facebook account

⚠️ **Use dedicated accounts**
- Don't use your personal Facebook account
- Create separate accounts for scraping
- Use accounts with minimal personal information

⚠️ **Rotate cookies regularly**
- Extract fresh cookies weekly
- Delete old cookies from .env
- Monitor for suspicious activity

⚠️ **Don't commit to Git**
- `.env` is already in `.gitignore`
- Never commit cookies to version control
- Use Railway environment variables for production

---

## Alternative: Run Without Cookies (Limited)

You can run the scraper without cookies, but:
- ❌ Can only access public pages
- ❌ Limited information available
- ❌ Higher chance of being blocked
- ✅ No account required

To test without cookies:
```bash
# Leave FACEBOOK_COOKIES empty
FACEBOOK_COOKIES=[]
```

The scraper will attempt to access pages without authentication.

---

## Production Setup (Railway)

1. Extract cookies locally (using methods above)
2. Go to Railway project → Variables
3. Add `FACEBOOK_COOKIES` variable
4. Paste the entire JSON array
5. Deploy

**Tip**: Use a dedicated Facebook account for production, not your personal account.
