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
 * Pause scrape queue
 * POST /api/queue/pause
 */
app.post('/api/queue/pause', async (req, res) => {
    try {
        await scrapeQueue.pause();
        log('[API] Scrape queue paused');

        res.json({
            status: 'paused',
            message: 'Queue paused. Running jobs will complete, no new jobs will start.'
        });
    } catch (error) {
        logError('Error pausing queue', error);
        res.status(500).json({ error: 'Failed to pause queue', message: error.message });
    }
});

/**
 * Resume scrape queue
 * POST /api/queue/resume
 */
app.post('/api/queue/resume', async (req, res) => {
    try {
        await scrapeQueue.resume();
        log('[API] Scrape queue resumed');

        res.json({
            status: 'resumed',
            message: 'Queue resumed. Processing jobs now.'
        });
    } catch (error) {
        logError('Error resuming queue', error);
        res.status(500).json({ error: 'Failed to resume queue', message: error.message });
    }
});

/**
 * Drain queue - remove waiting jobs
 * POST /api/queue/drain
 */
app.post('/api/queue/drain', async (req, res) => {
    try {
        const beforeCount = await scrapeQueue.getWaitingCount();
        await scrapeQueue.drain();

        log(`[API] Drained ${beforeCount} waiting jobs`);

        res.json({
            status: 'drained',
            removedJobs: beforeCount,
            message: `Removed ${beforeCount} waiting jobs. Active jobs continue.`
        });
    } catch (error) {
        logError('Error draining queue', error);
        res.status(500).json({ error: 'Failed to drain queue', message: error.message });
    }
});

/**
 * Clean queue - remove old jobs
 * POST /api/queue/clean
 */
app.post('/api/queue/clean', async (req, res) => {
    try {
        const grace = req.body.grace || 3600000; // 1 hour default

        const [completed, failed] = await Promise.all([
            scrapeQueue.clean(grace, 0, 'completed'),
            scrapeQueue.clean(grace, 0, 'failed'),
        ]);

        log(`[API] Cleaned ${completed.length + failed.length} old jobs`);

        res.json({
            status: 'cleaned',
            removed: { completed: completed.length, failed: failed.length },
            message: `Removed ${completed.length + failed.length} old jobs`
        });
    } catch (error) {
        logError('Error cleaning queue', error);
        res.status(500).json({ error: 'Failed to clean queue', message: error.message });
    }
});

/**
 * Obliterate queue - DELETE ALL
 * POST /api/queue/obliterate
 */
app.post('/api/queue/obliterate', async (req, res) => {
    try {
        if (req.body.confirm !== 'YES_DELETE_ALL') {
            return res.status(400).json({
                error: 'Confirmation required',
                message: 'Send { "confirm": "YES_DELETE_ALL" } to obliterate queue'
            });
        }

        await scrapeQueue.obliterate();
        log('[API] ⚠️  Queue obliterated!');

        res.json({
            status: 'obliterated',
            message: 'ALL jobs removed from queue'
        });
    } catch (error) {
        logError('Error obliterating queue', error);
        res.status(500).json({ error: 'Failed to obliterate queue', message: error.message });
    }
});

/**
 * Get queue stats
 * GET /api/queue/stats
 */
app.get('/api/queue/stats', async (req, res) => {
    try {
        const [waiting, active, completed, failed, isPaused] = await Promise.all([
            scrapeQueue.getWaitingCount(),
            scrapeQueue.getActiveCount(),
            scrapeQueue.getCompletedCount(),
            scrapeQueue.getFailedCount(),
            scrapeQueue.isPaused(),
        ]);

        res.json({
            isPaused,
            counts: { waiting, active, completed, failed, total: waiting + active + completed + failed }
        });
    } catch (error) {
        logError('Error getting stats', error);
        res.status(500).json({ error: 'Failed to get stats', message: error.message });
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
        const shutdown = async () => {
            log('SIGINT received. Shutting down gracefully...');

            log('Shutting down all jobs...');
            await scrapeQueue.close();
            log('All jobs stopped');

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
