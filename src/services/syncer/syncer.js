/**
 * Syncer Service - Batch writer to Google Sheets
 * 
 * Flow:
 * 1. Consume results from results-queue
 * 2. Buffer results in memory
 * 3. Flush to Google Sheets when:
 *    - Buffer reaches 50 items, OR
 *    - 30 seconds have passed since last flush
 * 
 * This protects Google Sheets API from rate limits.
 */

const { Worker } = require('bullmq');
const { connection } = require('../../config/redis');
const { log, logError } = require('../../utils/utils');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Buffer configuration
const BUFFER_SIZE = parseInt(process.env.SYNC_BUFFER_SIZE || '50', 10);
const FLUSH_INTERVAL_MS = parseInt(process.env.SYNC_FLUSH_INTERVAL_MS || '30000', 10);

// In-memory buffer
let resultBuffer = {};  // { sheetId: [results] }
let flushTimer = null;

/**
 * Initialize Google Sheets document
 */
async function loadSheet(sheetId) {
    const doc = new GoogleSpreadsheet(sheetId);

    // Authenticate
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Missing Google Sheets credentials in environment');
    }

    // Handle newlines in private key
    key = key.replace(/\\n/g, '\n');

    try {
        await doc.useServiceAccountAuth({
            client_email: email,
            private_key: key,
        });
        await doc.loadInfo();
        log(`[Syncer] Loaded sheet: ${doc.title}`);
        return doc;
    } catch (error) {
        logError('[Syncer] Failed to authenticate with Google Sheets', error);
        throw error;
    }
}

/**
 * Flush buffered results to Google Sheets with retry logic
 */
async function flushBuffer() {
    const sheetsToFlush = Object.keys(resultBuffer);

    if (sheetsToFlush.length === 0) {
        return; // Nothing to flush
    }

    log(`[Syncer] Flushing buffer for ${sheetsToFlush.length} sheet(s)...`);

    for (const sheetId of sheetsToFlush) {
        const results = resultBuffer[sheetId];

        if (!results || results.length === 0) {
            continue;
        }

        let retries = 0;
        const maxRetries = 3;
        let success = false;

        while (retries < maxRetries && !success) {
            try {
                // Load the sheet
                const doc = await loadSheet(sheetId);
                const sheet = doc.sheetsByIndex[0]; // First sheet
                await sheet.loadHeaderRow();
                const rows = await sheet.getRows();

                // Update rows in memory (no API calls yet)
                let updated = 0;
                const rowsToSave = [];

                for (const result of results) {
                    const { rowIndex, email, status } = result;

                    // Find the row (rowIndex is 1-based, getRows is 0-based)
                    const row = rows[rowIndex - 2]; // -2 because row 1 is header

                    if (row) {
                        row['email'] = email || 'Not found';
                        row['status'] = status || 'Done';
                        rowsToSave.push(row);
                        updated++;
                    } else {
                        log(`[Syncer] ⚠️  Row ${rowIndex} not found in sheet`);
                    }
                }

                // Save all updated rows
                if (updated > 0) {
                    log(`[Syncer] Saving ${updated} rows...`);

                    // Save rows individually (v3 API requirement)
                    for (const row of rowsToSave) {
                        await row.save();
                    }

                    log(`[Syncer] ✅ Flushed ${updated} results to sheet ${sheetId} (${updated} rows saved)`);
                }

                success = true;

                // Clear this sheet's buffer only on success
                delete resultBuffer[sheetId];

            } catch (error) {
                // Check if it's a rate limit error (429)
                if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
                    retries++;
                    const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s

                    if (retries < maxRetries) {
                        log(`[Syncer] ⚠️  Rate limit hit. Retry ${retries}/${maxRetries} after ${waitTime}ms...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else {
                        logError(`[Syncer] ❌ Rate limit retry exhausted for sheet ${sheetId}. Keeping ${results.length} results buffered.`, error);
                        // Keep buffer - will retry on next flush cycle
                    }
                } else {
                    // Non-rate-limit error - log and clear buffer
                    logError(`[Syncer] Failed to flush results for sheet ${sheetId}`, error);
                    delete resultBuffer[sheetId];
                    break;
                }
            }
        }
    }

    log(`[Syncer] Flush complete`);
}

/**
 * Add result to buffer and trigger flush if needed
 */
async function bufferResult(result) {
    const { sheetId } = result;

    // Initialize buffer for this sheet if needed
    if (!resultBuffer[sheetId]) {
        resultBuffer[sheetId] = [];
    }

    resultBuffer[sheetId].push(result);

    const totalBuffered = Object.values(resultBuffer).reduce(
        (sum, arr) => sum + arr.length,
        0
    );

    log(`[Syncer] Buffered result. Total buffered: ${totalBuffered}`);

    // Check if we should flush
    if (totalBuffered >= BUFFER_SIZE) {
        log(`[Syncer] Buffer size reached (${BUFFER_SIZE}), flushing...`);
        clearTimeout(flushTimer);
        await flushBuffer();
        // Restart timer
        scheduleFlush();
    }
}

/**
 * Schedule periodic flush
 */
function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(async () => {
        const totalBuffered = Object.values(resultBuffer).reduce(
            (sum, arr) => sum + arr.length,
            0
        );

        if (totalBuffered > 0) {
            log(`[Syncer] Flush interval reached (${FLUSH_INTERVAL_MS}ms), flushing ${totalBuffered} results...`);
            await flushBuffer();
        }

        // Reschedule
        scheduleFlush();
    }, FLUSH_INTERVAL_MS);
}

/**
 * Job processor function
 */
async function processResult(job) {
    log(`[Syncer] Processing result job ${job.id}`);

    const result = job.data;

    // Add to buffer
    await bufferResult(result);

    return { buffered: true };
}

/**
 * Create and start the syncer worker
 */
function createSyncer() {
    const worker = new Worker('results-queue', processResult, {
        connection,
        concurrency: 1, // Process one at a time (buffering handles batching)
    });

    // Start periodic flush
    scheduleFlush();

    // Event listeners
    worker.on('completed', (job) => {
        log(`[Syncer] ✅ Result buffered from job ${job.id}`);
    });

    worker.on('failed', (job, error) => {
        logError(`[Syncer] ❌ Job ${job?.id} failed`, error);
    });

    worker.on('error', (error) => {
        logError('[Syncer] Worker error', error);
    });

    // Graceful shutdown
    const shutdown = async () => {
        log('[Syncer] Shutting down...');
        clearTimeout(flushTimer);

        // Flush any remaining buffered results
        await flushBuffer();

        await worker.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    log(`[Syncer] Started`);
    log(`   Buffer size: ${BUFFER_SIZE}`);
    log(`   Flush interval: ${FLUSH_INTERVAL_MS}ms`);

    return worker;
}

module.exports = { createSyncer, flushBuffer };
