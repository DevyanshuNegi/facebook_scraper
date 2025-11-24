/**
 * End-to-End Test for Complete Microservices Flow
 * 
 * Tests: API → Queue → Worker → Queue → Syncer → Google Sheets
 * 
 * Run: node src/tests/test-e2e.js YOUR_SHEET_ID
 */

require('dotenv').config();
const { scrapeQueue, resultsQueue } = require('../queues');
const { log } = require('../utils/utils');

async function testE2E() {
    const sheetId = process.argv[2];

    if (!sheetId) {
        console.error('❌ Usage: node src/tests/test-e2e.js YOUR_SHEET_ID');
        process.exit(1);
    }

    console.log('🧪 End-to-End Microservices Test\n');
    console.log(`Sheet ID: ${sheetId}\n`);

    try {
        // Step 1: Add scraping jobs
        console.log('1️⃣  Adding scraping jobs to queue...');
        const testUrls = [
            'https://facebook.com/zuck',
            'https://facebook.com/billgates',
            'https://facebook.com/elonmusk'
        ];

        for (let i = 0; i < testUrls.length; i++) {
            await scrapeQueue.add('scrape-url', {
                url: testUrls[i],
                rowIndex: i + 2,
                sheetId,
            }, {
                jobId: `e2e-${sheetId}-row-${i + 2}`,
            });
        }

        console.log(`✅ Added ${testUrls.length} scraping jobs`);

        // Step 2: Check queue status
        console.log('\n2️⃣  Queue status:');
        const scrapeWaiting = await scrapeQueue.getWaitingCount();
        console.log(`   scrape-queue waiting: ${scrapeWaiting}`);

        // Step 3: Instructions
        console.log('\n3️⃣  Make sure services are running:');
        console.log('   Terminal 1: npm run worker');
        console.log('   Terminal 2: npm run syncer');
        console.log('   Or: npm run dev (runs all)');

        // Step 4: Monitor
        console.log('\n4️⃣  Monitor progress:');
        console.log('   Bull Board: http://localhost:3000/admin/queues');
        console.log('   Watch scrape-queue → decrease');
        console.log('   Watch results-queue → increase then decrease');

        // Step 5: Expected flow
        console.log('\n5️⃣  Expected flow:');
        console.log('   1. Worker scrapes URLs (parallel)');
        console.log('   2. Worker pushes results to results-queue');
        console.log('   3. Syncer buffers results');
        console.log('   4. After 30s or 50 items → Syncer flushes to Sheets');

        console.log('\n6️⃣  Check your Google Sheet:');
        console.log(`   https://docs.google.com/spreadsheets/d/${sheetId}`);
        console.log('   Rows should update with emails/status');

        console.log('\n✅ Test jobs added. Monitor the queues!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        await scrapeQueue.close();
        await resultsQueue.close();
        process.exit(0);
    }
}

testE2E();
