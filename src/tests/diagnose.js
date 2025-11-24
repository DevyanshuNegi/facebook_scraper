#!/usr/bin/env node
/**
 * Quick diagnostic to check why Google Sheets aren't updating
 */

require('dotenv').config();
const { scrapeQueue, resultsQueue } = require('../queues');

async function diagnose() {
    console.log('🔍 Diagnosing Google Sheets Update Issue\n');

    try {
        // Check queue depths
        console.log('1️⃣  Queue Status:');
        const scrapeWaiting = await scrapeQueue.getWaitingCount();
        const scrapeActive = await scrapeQueue.getActiveCount();
        const scrapeCompleted = await scrapeQueue.getCompletedCount();
        const scrapeFailed = await scrapeQueue.getFailedCount();

        console.log(`   scrape-queue:`);
        console.log(`     Waiting: ${scrapeWaiting}`);
        console.log(`     Active: ${scrapeActive}`);
        console.log(`     Completed: ${scrapeCompleted}`);
        console.log(`     Failed: ${scrapeFailed}`);

        const resultsWaiting = await resultsQueue.getWaitingCount();
        const resultsActive = await resultsQueue.getActiveCount();
        const resultsCompleted = await resultsQueue.getCompletedCount();
        const resultsFailed = await resultsQueue.getFailedCount();

        console.log(`   results-queue:`);
        console.log(`     Waiting: ${resultsWaiting}`);
        console.log(`    Active: ${resultsActive}`);
        console.log(`     Completed: ${resultsCompleted}`);
        console.log(`     Failed: ${resultsFailed}`);

        // Check if services are running
        console.log('\n2️⃣  Service Check:');
        console.log(`   Worker: ${scrapeActive > 0 ? '✅ Processing' : resultsWaiting > 0 ? '⚠️  Idle (results waiting)' : '✅ Idle'}`);
        console.log(`   Syncer: ${resultsActive > 0 ? '✅ Processing' : resultsWaiting > 0 ? '❌ NOT RUNNING!' : '✅ Idle'}`);

        // Check failed jobs
        if (scrapeFailed > 0) {
            console.log('\n3️⃣  Failed scrape jobs:');
            const failed = await scrapeQueue.getFailed(0, 5);
            for (const job of failed) {
                console.log(`     Job ${job.id}: ${job.failedReason}`);
            }
        }

        if (resultsFailed > 0) {
            console.log('\n4️⃣  Failed result jobs:');
            const failed = await resultsQueue.getFailed(0, 5);
            for (const job of failed) {
                console.log(`     Job ${job.id}: ${job.failedReason}`);
            }
        }

        // Recommendations
        console.log('\n💡 Recommendations:');
        if (resultsWaiting > 0 && resultsActive === 0) {
            console.log('   ❌ Syncer is NOT running! Start it with: npm run syncer');
        }
        if (scrapeWaiting > 0 && scrapeActive === 0) {
            console.log('   ❌ Worker is NOT running! Start it with: npm run worker');
        }
        if (resultsFailed > 0) {
            console.log('   ⚠️  Some results failed to sync. Check Google Sheets credentials.');
        }
        if (scrapeWaiting === 0 && resultsWaiting === 0 && scrapeCompleted > 0) {
            console.log('   ✅ All jobs processed! Check your Google Sheet.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await scrapeQueue.close();
        await resultsQueue.close();
        process.exit(0);
    }
}

diagnose();
