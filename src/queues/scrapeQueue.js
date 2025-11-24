/**
 * Scrape Queue - For scraping jobs
 * Jobs: URL scraping tasks with retry logic
 */

const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const scrapeQueue = new Queue('scrape-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s, then 4s, then 8s
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 3600,  // Remove after 1 hour
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
            age: 86400, // Remove after 24 hours
        },
    },
});

// Event listeners for debugging
scrapeQueue.on('error', (error) => {
    console.error('[scrape-queue] Error:', error);
});

module.exports = scrapeQueue;
