#!/usr/bin/env node
'use strict';

/**
 * Main entry point for the Facebook Scraper API server
 */

require('dotenv').config();

// Start the Express server
const { startServer } = require('./server');
const { log } = require('../utils/utils');

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
const PORT = process.env.PORT || 3000;

log('🚀 Starting Facebook Scraper API...');
startServer(PORT).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
