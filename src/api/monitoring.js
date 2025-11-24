/**
 * Bull Board Monitoring UI configuration
 * Provides web interface for queue management at /admin/queues
 */

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const { scrapeQueue, resultsQueue } = require('../queues');

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with our queues
createBullBoard({
    queues: [
        new BullMQAdapter(scrapeQueue),
        new BullMQAdapter(resultsQueue),
    ],
    serverAdapter,
});

module.exports = { serverAdapter };
