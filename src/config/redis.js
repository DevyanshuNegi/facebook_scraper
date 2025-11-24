/**
 * Redis connection configuration for BullMQ
 */

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,    // Recommended for BullMQ
};

module.exports = { connection };
