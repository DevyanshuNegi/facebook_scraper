/**
 * Results Queue - For batch writing results to Google Sheets
 * Jobs: Scraped results ready to be written
 */

const { Queue } = require('bullmq');
const { connection } = require('../config/redis');

const resultsQueue = new Queue('results-queue', {
    connection,
    defaultJobOptions: {
        attempts: 5, // More retries for writing since it's critical
        backoff: {
            type: 'exponential',
            delay: 3000, // Start with 3s
        },
        removeOnComplete: {
            count: 50,
            age: 1800, // 30 minutes
        },
        removeOnFail: {
            count: 1000,
            age: 172800, // 48 hours - keep failures longer
        },
    },
});

// Event listeners
resultsQueue.on('error', (error) => {
    console.error('[results-queue] Error:', error);
});

module.exports = resultsQueue;
