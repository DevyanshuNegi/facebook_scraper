const { v4: uuidv4 } = require('uuid');
const ScraperEngine = require('./scraper');
const { log, logError } = require('./utils');

class JobManager {
    constructor() {
        this.jobs = new Map(); // jobId -> { sheetId, scraper, status, stats, stopRequested }
    }

    /**
     * Start a new polling job for a Google Sheet
     * @param {string} sheetId - Google Sheet ID
     * @returns {string} jobId - Unique job identifier
     */
    async startJob(sheetId) {
        // Check if a job already exists for this sheet
        const existingJob = this.findJobBySheetId(sheetId);
        if (existingJob) {
            log(`Job already exists for sheet ${sheetId}: ${existingJob.jobId}`);
            return existingJob.jobId;
        }

        const jobId = uuidv4();
        const scraper = new ScraperEngine();

        // Initialize scraper
        await scraper.init();

        // Create job record
        this.jobs.set(jobId, {
            jobId,
            sheetId,
            scraper,
            status: 'running',
            stats: {
                processed: 0,
                pending: 0,
                failed: 0,
                startedAt: new Date().toISOString()
            },
            stopRequested: false
        });

        // Start polling in background (non-blocking)
        this.runPollingLoop(jobId, sheetId, scraper);

        log(`Started job ${jobId} for sheet ${sheetId}`);
        return jobId;
    }

    /**
     * Stop a polling job
     * @param {string} jobId - Job identifier
     */
    async stopJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        log(`Stopping job ${jobId}...`);
        job.stopRequested = true;
        job.status = 'stopping';

        // Stop the scraper's polling loop
        if (job.scraper) {
            job.scraper.stopPolling();
            await job.scraper.close();
        }

        job.status = 'stopped';
        job.stats.stoppedAt = new Date().toISOString();

        // Keep job in map for status queries, but mark as stopped
        log(`Job ${jobId} stopped`);
    }

    /**
     * Get job status and statistics
     * @param {string} jobId - Job identifier
     * @returns {object} Job status
     */
    getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return null;
        }

        return {
            jobId: job.jobId,
            sheetId: job.sheetId,
            status: job.status,
            stats: job.stats
        };
    }

    /**
     * Get all active jobs
     * @returns {Array} List of job statuses
     */
    getAllJobs() {
        return Array.from(this.jobs.values()).map(job => ({
            jobId: job.jobId,
            sheetId: job.sheetId,
            status: job.status,
            stats: job.stats
        }));
    }

    /**
     * Find job by sheet ID
     * @param {string} sheetId - Google Sheet ID
     * @returns {object|null} Job if found
     */
    findJobBySheetId(sheetId) {
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.sheetId === sheetId && job.status === 'running') {
                return { jobId, ...job };
            }
        }
        return null;
    }

    /**
     * Run the polling loop for a job
     * @param {string} jobId - Job identifier
     * @param {string} sheetId - Google Sheet ID
     * @param {ScraperEngine} scraper - Scraper instance
     */
    async runPollingLoop(jobId, sheetId, scraper) {
        const job = this.jobs.get(jobId);
        const pollingInterval = parseInt(process.env.POLLING_INTERVAL_MS) || 12000;

        try {
            await scraper.startPolling(sheetId, pollingInterval, (stats) => {
                // Update job stats from scraper
                if (job) {
                    job.stats.processed = stats.processed;
                    job.stats.pending = stats.pending;
                    job.stats.failed = stats.failed;
                }
            });
        } catch (error) {
            logError(`Polling loop error for job ${jobId}`, error);
            if (job) {
                job.status = 'error';
                job.stats.error = error.message;
            }
        } finally {
            // Clean up when polling stops
            if (job && job.status !== 'stopped') {
                job.status = 'completed';
                job.stats.completedAt = new Date().toISOString();
            }
        }
    }

    /**
     * Graceful shutdown - stop all jobs
     */
    async shutdown() {
        log('Shutting down all jobs...');
        const stopPromises = Array.from(this.jobs.keys()).map(jobId => this.stopJob(jobId));
        await Promise.all(stopPromises);
        log('All jobs stopped');
    }
}

module.exports = JobManager;
