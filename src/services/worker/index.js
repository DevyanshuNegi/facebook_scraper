#!/usr/bin/env node
/**
 * Worker Service Entry Point
 * 
 * Run: node src/services/worker/index.js
 * or: npm run worker
 */

require('dotenv').config();
const { createWorker } = require('./worker');
const { log } = require('../../utils/utils');

log('🔧 Starting Worker Service...');
log(`   Concurrency: ${process.env.WORKER_CONCURRENCY || '3'}`);
log(`   Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);

// Create and start worker
const worker = createWorker();

log('✅ Worker service running. Waiting for jobs...');
log('   Press Ctrl+C to stop');
