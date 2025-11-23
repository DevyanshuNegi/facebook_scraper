// Debug script to check Google Sheet structure
require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function debugSheetStructure(sheetId) {
    console.log('\n🔍 Debugging Google Sheet Structure\n');
    console.log('Sheet ID:', sheetId);
    console.log('─'.repeat(60));

    try {
        // 1. Authenticate
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const key = process.env.GOOGLE_PRIVATE_KEY;

        if (!email || !key) {
            console.error('❌ Missing credentials in .env file');
            console.log('\nRequired:');
            console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL');
            console.log('  - GOOGLE_PRIVATE_KEY');
            process.exit(1);
        }

        console.log('✅ Credentials found');
        console.log('   Service Account:', email);

        // Replace literal \n with actual newlines
        const privateKey = key.replace(/\\n/g, '\n');

        // 2. Load sheet (v3 API)
        console.log('\n📄 Loading sheet...');
        const doc = new GoogleSpreadsheet(sheetId);

        await doc.useServiceAccountAuth({
            client_email: email,
            private_key: privateKey,
        });

        await doc.loadInfo();

        console.log('✅ Sheet loaded successfully');
        console.log('   Title:', doc.title);

        const sheet = doc.sheetsByIndex[0];
        console.log('   First tab:', sheet.title);
        console.log('   Row count:', sheet.rowCount);
        console.log('   Column count:', sheet.columnCount);

        // 3. Check headers
        console.log('\n📋 Column Headers:');
        console.log('   Expected: ["url", "email", "status"]');
        console.log('   Found:   ', JSON.stringify(sheet.headerValues));

        const hasCorrectHeaders =
            sheet.headerValues[0] === 'url' &&
            sheet.headerValues[1] === 'email' &&
            sheet.headerValues[2] === 'status';

        if (hasCorrectHeaders) {
            console.log('   ✅ Headers are correct!');
        } else {
            console.log('   ❌ Headers are INCORRECT!');
            console.log('\n   Fix your sheet:');
            console.log('   - Cell A1 should be: "url" (lowercase)');
            console.log('   - Cell B1 should be: "email" (lowercase)');
            console.log('   - Cell C1 should be: "status" (lowercase)');
        }

        // 4. Get rows
        console.log('\n📊 Data Rows:');
        const rows = await sheet.getRows();
        console.log('   Total rows:', rows.length);

        if (rows.length === 0) {
            console.log('   ⚠️  No data rows found!');
            console.log('\n   Add data to your sheet:');
            console.log('   - Row 2, Column A: Add a Facebook URL');
            console.log('   - Leave columns B and C empty');
            return;
        }

        // 5. Check pending rows
        console.log('\n🔍 Checking for pending rows...');
        const pending = rows.filter(row => row.url && !row.status);
        console.log('   Pending rows:', pending.length);

        if (pending.length === 0) {
            console.log('   ❌ No pending rows found!');
            console.log('\n   Possible reasons:');
            console.log('   1. Column A (url) is empty');
            console.log('   2. Column C (status) already has a value');
            console.log('   3. Headers are incorrect');
        } else {
            console.log('   ✅ Found pending rows!');
        }

        // 6. Show sample data
        console.log('\n📝 First 5 Rows (Sample):');
        console.log('─'.repeat(60));
        console.log('Row | URL | Email | Status | Pending?');
        console.log('─'.repeat(60));

        rows.slice(0, 5).forEach((row, index) => {
            const rowNum = index + 2; // +2 for header row
            const url = row.url || '(empty)';
            const email = row.email || '(empty)';
            const status = row.status || '(empty)';
            const isPending = row.url && !row.status ? '✅ YES' : '❌ NO';

            console.log(`${rowNum}   | ${url.substring(0, 30)}... | ${email.substring(0, 15)} | ${status.substring(0, 10)} | ${isPending}`);
        });

        // 7. Summary
        console.log('\n' + '─'.repeat(60));
        console.log('📊 SUMMARY:');
        console.log('─'.repeat(60));
        console.log(`✅ Sheet accessible: YES`);
        console.log(`${hasCorrectHeaders ? '✅' : '❌'} Headers correct: ${hasCorrectHeaders ? 'YES' : 'NO'}`);
        console.log(`${rows.length > 0 ? '✅' : '❌'} Has data rows: ${rows.length > 0 ? 'YES' : 'NO'}`);
        console.log(`${pending.length > 0 ? '✅' : '❌'} Has pending rows: ${pending.length > 0 ? 'YES' : 'NO'}`);
        console.log('─'.repeat(60));

        if (hasCorrectHeaders && pending.length > 0) {
            console.log('\n🎉 Your sheet is ready! Start a job to begin processing.');
        } else {
            console.log('\n⚠️  Please fix the issues above before starting a job.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('permission')) {
            console.log('\n💡 Fix:');
            console.log('   1. Open your Google Sheet');
            console.log('   2. Click Share button');
            console.log('   3. Add this email with Editor permission:');
            console.log('      ', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        } else if (error.message.includes('not found')) {
            console.log('\n💡 Fix:');
            console.log('   - Check that the Sheet ID is correct');
            console.log('   - Make sure the sheet exists and is not deleted');
        }
    }
}

// Get sheet ID from command line
const sheetId = process.argv[2];

if (!sheetId) {
    console.log('Usage: node src/test_sheet_structure.js YOUR_SHEET_ID');
    console.log('\nExample:');
    console.log('  node src/test_sheet_structure.js 1ABC123xyz456');
    process.exit(1);
}

debugSheetStructure(sheetId);
