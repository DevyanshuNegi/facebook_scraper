/**
 * Ingestor Service - Automatic Sheet Polling
 * 
 * Continuously polls Google Sheets for new rows and adds them to scrape-queue.
 * This eliminates the need to manually call /api/start-queue.
 */

require('dotenv').config();
const { scrapeQueue } = require('../../queues');
const { getPendingRows } = require('../../integrations/sheets');
const { log, logError } = require('../../utils/utils');

// Configuration
const POLL_INTERVAL_MS = parseInt(process.env.INGESTOR_POLL_INTERVAL_MS || '60000', 10); // 1 minute
const BATCH_SIZE = parseInt(process.env.INGESTOR_BATCH_SIZE || '100', 10);
const SHEET_ID = process.env.GOOGLE_SHEET_ID; // Default sheet to monitor

/**
 * Poll sheet and add pending rows to queue
 */
async function pollAndIngest(sheetId) {
    try {
        log(`[Ingestor] Polling sheet ${sheetId} for pending rows...`);

        // Get pending rows (limit to batch size)
        const pendingRows = await getPendingRows(sheetId, BATCH_SIZE);

        if (pendingRows.length === 0) {
            log(`[Ingestor] No pending rows found`);
            return 0;
        }

        log(`[Ingestor] Found ${pendingRows.length} pending rows, adding to queue...`);

        // Add to queue
        let added = 0;
        for (const row of pendingRows) {
            try {
                await scrapeQueue.add('scrape-url', {
                    url: row.url,
                    rowIndex: row.rowIndex,
                    sheetId,
                }, {
                    jobId: `${sheetId}-row-${row.rowIndex}`, // Deduplication
                    removeOnComplete: 1000, // Keep last 1000 completed jobs
                    removeOnFail: 5000, // Keep last 5000 failed jobs
                });
                added++;
            } catch (error) {
                // Job already exists (duplicate) - skip
                if (error.message?.includes('already exists')) {
                    continue;
                }
                throw error;
            }
        }

        log(`[Ingestor] ✅ Added ${added} new jobs to queue (${pendingRows.length - added} were duplicates)`);
        return added;

    } catch (error) {
        logError('[Ingestor] Failed to poll sheet', error);
        return 0;
    }
}

/**
 * Start the ingestor service
 */
async function startIngestor(sheetId) {
    if (!sheetId) {
        throw new Error('Sheet ID is required. Set GOOGLE_SHEET_ID in .env or pass as argument.');
    }

    log(`🔄 Starting Ingestor Service (Greedy Mode)...`);
    log(`   Sheet ID: ${sheetId}`);
    log(`   Poll Interval: ${POLL_INTERVAL_MS}ms (when empty)`);
    log(`   Batch Size: ${BATCH_SIZE}`);

    let isRunning = true;
    let timeoutId = null;

    // Graceful shutdown
    const shutdown = async () => {
        log('[Ingestor] Shutting down...');
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        await scrapeQueue.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Recursive polling loop
    const runLoop = async () => {
        if (!isRunning) return;

        try {
            const added = await pollAndIngest(sheetId);

            if (added > 0) {
                // Found rows! Don't wait 60s.
                // Wait a tiny bit (5s) to let queue absorb, then go again immediately.
                log(`[Ingestor] 🚀 Found rows! Checking for more in 5s...`);
                timeoutId = setTimeout(runLoop, 5000);
            } else {
                // No rows found. Wait full interval.
                log(`[Ingestor] 💤 No rows. Sleeping for ${POLL_INTERVAL_MS / 1000}s...`);
                timeoutId = setTimeout(runLoop, POLL_INTERVAL_MS);
            }
        } catch (error) {
            logError('[Ingestor] Error in loop', error);
            // On error, wait full interval before retrying
            timeoutId = setTimeout(runLoop, POLL_INTERVAL_MS);
        }
    };

    // Start the loop
    runLoop();

    log(`✅ Ingestor service running.`);
    log(`   Press Ctrl+C to stop`);
}

module.exports = { startIngestor, pollAndIngest };
