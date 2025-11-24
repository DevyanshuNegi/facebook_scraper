/**
 * Simple test script to verify queue infrastructure
 * Run: node src/tests/test-queue.js
 */

require('dotenv').config();
const { scrapeQueue, resultsQueue } = require('../queues');

async function testQueues() {
    console.log('🧪 Testing Queue Infrastructure...\n');

    try {
        // Test 1: Add job to scrape queue
        console.log('1️⃣  Adding test job to scrape-queue...');
        const job = await scrapeQueue.add('test-scrape', {
            url: 'https://facebook.com/test',
            rowIndex: 1,
            sheetId: 'test-sheet-123',
        }, {
            jobId: 'test-row-1', // Deduplication
        });
        console.log('✅ Job added:', job.id);

        // Test 2: Get queue stats
        console.log('\n2️⃣  Checking queue statistics...');
        const waiting = await scrapeQueue.getWaitingCount();
        const active = await scrapeQueue.getActiveCount();
        const completed = await scrapeQueue.getCompletedCount();
        const failed = await scrapeQueue.getFailedCount();

        console.log(`   Waiting: ${waiting}`);
        console.log(`   Active: ${active}`);
        console.log(`   Completed: ${completed}`);
        console.log(`   Failed: ${failed}`);

        // Test 3: Test deduplication
        console.log('\n3️⃣  Testing job deduplication...');
        try {
            await scrapeQueue.add('test-scrape', {
                url: 'https://facebook.com/test',
                rowIndex: 1,
            }, {
                jobId: 'test-row-1', // Same jobId
            });
            console.log('❌ Deduplication failed - duplicate job added!');
        } catch (error) {
            console.log('✅ Deduplication working - duplicate rejected');
        }

        // Test 4: Add to results queue
        console.log('\n4️⃣  Adding test result to results-queue...');
        const resultJob = await resultsQueue.add('test-result', {
            rowIndex: 1,
            email: 'test@example.com',
            status: 'Done',
        });
        console.log('✅ Result added:', resultJob.id);

        console.log('\n✅ All tests passed!');
        console.log('\n💡 View queues in Bull Board: http://localhost:3000/admin/queues');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        // Clean up
        await scrapeQueue.close();
        await resultsQueue.close();
        process.exit(0);
    }
}

testQueues();
