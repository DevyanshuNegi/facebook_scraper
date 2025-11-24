/**
 * Test script for Worker service
 * Tests: Consumer → Scraper → Results Queue flow
 * 
 * Run: node src/tests/test-worker.js
 */

require('dotenv').config();
const { scrapeQueue, resultsQueue } = require('../queues');
const { log } = require('../utils/utils');

async function testWorker() {
    console.log('🧪 Testing Worker Service...\n');

    try {
        // Step 1: Add test scraping job
        console.log('1️⃣  Adding test scraping job to queue...');
        const testUrl = 'https://www.facebook.com/zuck'; // Mark Zuckerberg's page

        const job = await scrapeQueue.add('scrape-url', {
            url: testUrl,
            rowIndex: 99,
            sheetId: 'test-worker-sheet',
        }, {
            jobId: `test-worker-${Date.now()}`, // Unique ID
        });

        console.log(`✅ Job added: ${job.id}`);
        console.log(`   URL: ${testUrl}`);

        // Step 2: Wait for processing
        console.log('\n2️⃣  Waiting for worker to process...');
        console.log('   (Make sure worker is running: npm run worker)');

        const result = await job.waitUntilFinished();
        console.log('✅ Job completed!');
        console.log('   Result:', JSON.stringify(result, null, 2));

        // Step 3: Check results queue
        console.log('\n3️⃣  Checking results queue...');
        const resultsCount = await resultsQueue.getWaitingCount();
        console.log(`   Results waiting: ${resultsCount}`);

        if (resultsCount > 0) {
            console.log('✅ Result pushed to results-queue successfully');
        } else {
            console.log('⚠️  No results in queue (might have been processed already)');
        }

        // Step 4: Summary
        console.log('\n✅ Worker test passed!');
        console.log('\n💡 Next steps:');
        console.log('   - Build Syncer to consume from results-queue');
        console.log('   - Syncer will batch-write to Google Sheets');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        await scrapeQueue.close();
        await resultsQueue.close();
        process.exit(0);
    }
}

testWorker();
