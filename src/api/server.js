require('dotenv').config();
const express = require('express');
const JobManager = require('../core/jobManager');
const { log, logError } = require('../utils/utils');
const { serverAdapter } = require('./monitoring');
const { scrapeQueue } = require('../queues');

const app = express();
const jobManager = new JobManager();

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
 * Health check endpoint for Railway
 */
app.get('/health', (req, res) => {
    const activeJobs = jobManager.getAllJobs().filter(j => j.status === 'running').length;
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeJobs,
        timestamp: new Date().toISOString()
    });
});

/**
 * Start a new polling job (Legacy - uses JobManager)
 * POST /api/start
 * Body: { "sheetId": "your_google_sheet_id" }
 */
app.post('/api/start', async (req, res) => {
    try {
        const { sheetId } = req.body;

        if (!sheetId) {
            return res.status(400).json({
                error: 'Missing required field: sheetId'
            });
        }

        log(`Starting polling job for sheet: ${sheetId}`);
        const jobId = await jobManager.startJob(sheetId);

        res.json({
            jobId,
            sheetId,
            status: 'started',
            message: 'Polling job started successfully (Legacy mode)'
        });
    } catch (error) {
        logError('Error starting job', error);
        res.status(500).json({
            error: 'Failed to start job',
            message: error.message
        });
    }
});

/**
 * Start scraping using BullMQ (New queue-based approach)
 * POST /api/start-queue
 * Body: { "sheetId": "your_google_sheet_id", "urls": ["url1", "url2"] }
 */
app.post('/api/start-queue', async (req, res) => {
    try {
        const { sheetId, urls } = req.body;

        if (!sheetId) {
            return res.status(400).json({
                error: 'Missing required field: sheetId'
            });
        }

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                error: 'Missing or invalid field: urls (must be non-empty array)'
            });
        }

        log(`Adding ${urls.length} URLs to scrape-queue for sheet: ${sheetId}`);

        const jobs = [];
        for (let i = 0; i < urls.length; i++) {
            const job = await scrapeQueue.add('scrape-url', {
                url: urls[i],
                rowIndex: i + 2, // Row 2 onwards (assuming row 1 is header)
                sheetId,
            }, {
                jobId: `${sheetId}-row-${i + 2}`, // Deduplication
            });
            jobs.push({ jobId: job.id, url: urls[i] });
        }

        res.json({
            sheetId,
            jobsAdded: jobs.length,
            jobs,
            message: 'URLs added to scrape queue successfully',
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
 * Get job status
 * GET /api/status/:jobId
 */
app.get('/api/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const status = jobManager.getJobStatus(jobId);

    if (!status) {
        return res.status(404).json({
            error: 'Job not found',
            jobId
        });
    }

    res.json(status);
});

/**
 * Stop a polling job
 * POST /api/stop/:jobId
 */
app.post('/api/stop/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        await jobManager.stopJob(jobId);

        res.json({
            jobId,
            status: 'stopped',
            message: 'Job stopped successfully'
        });
    } catch (error) {
        logError('Error stopping job', error);
        res.status(500).json({
            error: 'Failed to stop job',
            message: error.message
        });
    }
});

/**
 * List all jobs
 * GET /api/jobs
 */
app.get('/api/jobs', (req, res) => {
    const jobs = jobManager.getAllJobs();
    res.json({
        count: jobs.length,
        jobs
    });
});

/**
 * Root endpoint - API documentation
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Facebook Scraper API',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check',
            'POST /api/start': 'Start polling job (body: { sheetId })',
            'GET /api/status/:jobId': 'Get job status',
            'POST /api/stop/:jobId': 'Stop polling job',
            'GET /api/jobs': 'List all jobs'
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
