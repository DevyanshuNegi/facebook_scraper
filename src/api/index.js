#!/usr/bin/env node
'use strict';

/**
 * Main entry point for the Facebook Scraper API server
 */

require('dotenv').config();

// Start the Express server
const server = require('./server');

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
