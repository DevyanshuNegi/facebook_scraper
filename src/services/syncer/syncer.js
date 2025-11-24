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
 * Flush buffered results to Google Sheets
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

        try {
            // Load the sheet
            const doc = await loadSheet(sheetId);
            const sheet = doc.sheetsByIndex[0]; // First sheet
            await sheet.loadHeaderRow();
            const rows = await sheet.getRows();

            // Batch update rows
            let updated = 0;
            for (const result of results) {
                const { rowIndex, email, status } = result;

                // Find the row (rowIndex is 1-based, getRows is 0-based)
                const row = rows[rowIndex - 2]; // -2 because row 1 is header

                if (row) {
                    row['Email'] = email;
                    row['Status'] = status;
                    await row.save();
                    updated++;
                }
            }

            log(`[Syncer] ✅ Flushed ${updated} results to sheet ${sheetId}`);
        } catch (error) {
            logError(`[Syncer] Failed to flush results for sheet ${sheetId}`, error);
            // Don't throw - continue with other sheets
        }

        // Clear this sheet's buffer
        delete resultBuffer[sheetId];
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
