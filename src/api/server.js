require('dotenv').config();
const express = require('express');
const { log, logError } = require('../utils/utils');
const { serverAdapter } = require('./monitoring');
const { scrapeQueue } = require('../queues');

const app = express();

// Middleware
app.use(express.json());

// Bull Board monitoring UI
app.use('/admin/queues', serverAdapter.getRouter());

// Request logging middleware
app.use((req, res, next) => {
    log(`${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        const [waiting, active, completed] = await Promise.all([
            scrapeQueue.getWaitingCount(),
            scrapeQueue.getActiveCount(),
            scrapeQueue.getCompletedCount(),
        ]);

        res.json({
            status: 'ok',
            uptime: process.uptime(),
            queues: {
                waiting,
                active,
                completed
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Start scraping using BullMQ (Main endpoint - Ingestor pattern)
 * POST /api/start-queue
 * Body: {
 *   "sheetId": "your_google_sheet_id",
 *   "urls": [...] (optional),
 *   "batchSize": 50 (optional, default 100)
 * }
 *
 * If urls not provided, reads from Google Sheets automatically
 */
app.post('/api/start-queue', async (req, res) => {
    try {
        const { sheetId, urls, batchSize } = req.body;

        if (!sheetId) {
            return res.status(400).json({
                error: 'Missing required field: sheetId'
            });
        }

        const limit = parseInt(batchSize || '100', 10);
        let urlsToQueue;

        // If URLs provided, use them directly
        if (urls && Array.isArray(urls) && urls.length > 0) {
            urlsToQueue = urls.map((url, index) => ({
                url,
                rowIndex: index + 2, // Assume row 2 onwards
            }));
        } else {
            // Read from Google Sheets (Ingestor pattern)
            log(`[Ingestor] Reading URLs from Google Sheet: ${sheetId} (batch size: ${limit})`);

            const { getPendingRows } = require('../integrations/sheets');
            const pendingRows = await getPendingRows(sheetId, limit);

            if (pendingRows.length === 0) {
                return res.json({
                    sheetId,
                    jobsAdded: 0,
                    message: 'No pending URLs found in sheet (all have status)',
                    monitoringUrl: '/admin/queues'
                });
            }

            urlsToQueue = pendingRows.map(row => ({
                url: row.url,
                rowIndex: row.rowIndex,
            }));

            log(`[Ingestor] Found ${urlsToQueue.length} pending URLs`);
        }

        // Add all URLs to queue
        const jobs = [];
        for (const item of urlsToQueue) {
            const job = await scrapeQueue.add('scrape-url', {
                url: item.url,
                rowIndex: item.rowIndex,
                sheetId,
            }, {
                jobId: `${sheetId}-row-${item.rowIndex}`, // Deduplication
            });
            jobs.push({
                jobId: job.id,
                url: item.url,
                rowIndex: item.rowIndex
            });
        }

        log(`[Ingestor] Added ${jobs.length} jobs to scrape-queue`);

        res.json({
            sheetId,
            jobsAdded: jobs.length,
            batchSize: limit,
            jobs,
            message: urls
                ? 'URLs added to scrape queue successfully'
                : `${jobs.length} pending URLs from sheet added to queue (batch size: ${limit})`,
            monitoringUrl: '/admin/queues'
        });
    } catch (error) {
        logError('Error adding jobs to queue', error);
        res.status(500).json({
            error: 'Failed to add jobs to queue',
            message: error.message
        });
    }
});

/**
 * Root endpoint - API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Facebook Scraper API - Microservices',
        version: '2.0.0',
        architecture: 'BullMQ + Redis Queue-based',
        endpoints: {
            'GET /health': 'Health check with queue stats',
            'POST /api/start-queue': 'Add URLs to scrape queue',
            'POST /api/queue/pause': 'Pause queue (stop new jobs)',
            'POST /api/queue/resume': 'Resume queue',
            'POST /api/queue/drain': 'Remove all waiting jobs',
            'POST /api/queue/clean': 'Remove old completed/failed jobs',
            'POST /api/queue/obliterate': 'DANGER: Remove ALL jobs',
            'GET /api/queue/stats': 'Get queue statistics',
            'GET /admin/queues': 'Bull Board monitoring UI'
        },
        services: {
            'API': 'Triggers jobs and provides monitoring',
            'Worker': 'Processes scrape jobs (concurrency: 10)',
            'Syncer': 'Batch writes to Google Sheets',
            'Ingestor': 'Auto-polls sheets for new rows'
        }
    });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    logError('Unhandled error', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

/**
 * Start the server
 */
async function startServer(port = 3000) {
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            log(`🚀 API server running on port ${port}`);
            log(`📊 Health check: http://localhost:${port}/health`);
            log(`📝 API docs: http://localhost:${port}/`);
            resolve(server);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            log(`\n${signal} received. Shutting down gracefully...`);
            await jobManager.shutdown();
            server.close(() => {
                log('Server closed');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    });
}

module.exports = { startServer, app };
