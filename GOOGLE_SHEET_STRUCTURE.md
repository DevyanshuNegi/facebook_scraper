# Google Sheet Structure Guide

## ✅ Correct Structure

Your Google Sheet **MUST** have these exact column headers in **Row 1**:

![Google Sheet Structure](file:///home/devyanshu/.gemini/antigravity/brain/b13f18fc-74b0-408b-a137-c8dbab1cc6d5/google_sheet_structure_1763896081876.png)

### Row 1 (Headers) - CRITICAL!

| Column A | Column B | Column C |
|----------|----------|----------|
| **url** | **email** | **status** |

**Important**: 
- ⚠️ Headers must be **lowercase**: `url`, `email`, `status`
- ⚠️ Headers must be in **Row 1** (the very first row)
- ⚠️ No extra spaces or special characters

### Row 2+ (Data)

| Column A | Column B | Column C |
|----------|----------|----------|
| https://facebook.com/profile123 | *(empty)* | *(empty)* |
| https://facebook.com/anotherprofile | *(empty)* | *(empty)* |

---

## ❌ Common Mistakes

### Mistake 1: Wrong Header Names
```
❌ URL (uppercase)
❌ Url (capitalized)
❌ Profile URL (different name)
✅ url (correct - lowercase)
```

### Mistake 2: Headers Not in Row 1
```
❌ Row 1: (empty)
   Row 2: url, email, status
   
✅ Row 1: url, email, status
   Row 2: (data)
```

### Mistake 3: Extra Spaces
```
❌ " url" (space before)
❌ "url " (space after)
❌ "u rl" (space in middle)
✅ "url" (no spaces)
```

### Mistake 4: Missing Columns
```
❌ Only Column A: url
✅ All 3 columns: url, email, status
```

---

## 🔍 How the Code Detects Pending Rows

The code looks for rows where:
1. ✅ Column A (`url`) has a value
2. ✅ Column C (`status`) is **empty**

```javascript
// From sheets.js line 46
.filter(({ row, url }) => url && !row.get('status'));
```

This means:
- If `url` is empty → Row is **skipped**
- If `status` has any value → Row is **skipped**
- If `url` exists AND `status` is empty → Row is **processed**

---

## 🧪 Debug Your Sheet

Run this debug script to check your sheet structure:

```bash
node src/test_sheet_structure.js YOUR_SHEET_ID
```

This will show you:
- ✅ Column headers found
- ✅ Number of pending rows
- ✅ Sample of first 5 rows
- ❌ Any issues detected

---

## 📋 Step-by-Step Setup

### 1. Create New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **Blank** to create new sheet
3. Name it "Facebook Scraper Test"

### 2. Add Headers (Row 1)

Click on cell **A1** and type: `url`  
Click on cell **B1** and type: `email`  
Click on cell **C1** and type: `status`

**Make them bold** (optional but recommended):
- Select row 1
- Click **Bold** button or press `Ctrl+B`

### 3. Add Test Data (Row 2+)

Click on cell **A2** and paste a Facebook URL:
```
https://facebook.com/zuck
```

Leave **B2** and **C2** empty.

Add more URLs in **A3**, **A4**, etc.

### 4. Share with Service Account

1. Click **Share** button (top right)
2. Paste your service account email:
   ```
   your-service-account@project.iam.gserviceaccount.com
   ```
3. Set permission to **Editor**
4. Uncheck "Notify people"
5. Click **Share**

### 5. Get Sheet ID

From the URL:
```
https://docs.google.com/spreadsheets/d/1ABC123xyz456/edit
                                      ^^^^^^^^^^^^
                                      Copy this part
```

### 6. Test with API

```bash
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "1ABC123xyz456"}'
```

---

## 🐛 Troubleshooting "No Pending Rows"

### Check 1: Verify Headers

Open your Google Sheet and check:
- [ ] Row 1 has headers: `url`, `email`, `status`
- [ ] Headers are lowercase
- [ ] No extra spaces
- [ ] Headers are in the first row

### Check 2: Verify Data

- [ ] Column A (url) has Facebook URLs
- [ ] Column C (status) is **completely empty** (not even a space)
- [ ] URLs are in rows 2, 3, 4, etc. (not row 1)

### Check 3: Check Permissions

- [ ] Sheet is shared with service account email
- [ ] Service account has "Editor" permission
- [ ] You're using the correct Sheet ID

### Check 4: Check Logs

Look at your server logs for:
```
[INFO] Found 0 pending rows in sheet 1ABC123xyz456
```

If it says "0 pending rows", the issue is with the sheet structure.

### Check 5: Manual Test

Add this temporary debug code to `sheets.js` after line 38:

```javascript
const rows = await sheet.getRows();
console.log('Total rows:', rows.length);
console.log('First row headers:', sheet.headerValues);
if (rows.length > 0) {
    console.log('First row data:', {
        url: rows[0].get('url'),
        email: rows[0].get('email'),
        status: rows[0].get('status')
    });
}
```

Restart the server and check what it prints.

---

## ✅ Expected Output

When everything is correct, you should see:

```
[INFO] Found 5 pending rows in sheet 1ABC123xyz456
[INFO] Processing batch of 5 URLs...
[INFO] Processing row 2: https://facebook.com/profile1
[INFO] Processing row 3: https://facebook.com/profile2
...
```

And in your Google Sheet:
- Column C will change from empty → "Processing" → "Done"
- Column B will be filled with extracted emails

---

## 📸 Example Sheet

Here's what a correctly structured sheet looks like:

**Before Processing:**
| url | email | status |
|-----|-------|--------|
| https://facebook.com/profile1 | | |
| https://facebook.com/profile2 | | |
| https://facebook.com/profile3 | | |

**During Processing:**
| url | email | status |
|-----|-------|--------|
| https://facebook.com/profile1 | | Processing |
| https://facebook.com/profile2 | | Processing |
| https://facebook.com/profile3 | | |

**After Processing:**
| url | email | status |
|-----|-------|--------|
| https://facebook.com/profile1 | contact@example.com | Done |
| https://facebook.com/profile2 | Not found | Done |
| https://facebook.com/profile3 | info@company.com | Done |

---

## 🔧 Quick Fix Template

If you want to start fresh, copy this template:

1. Create new Google Sheet
2. Copy-paste this into cell A1:

```
url	email	status
https://facebook.com/zuck		
https://facebook.com/profile123		
```

3. Share with service account
4. Test again

The tabs will automatically create the correct column structure.
