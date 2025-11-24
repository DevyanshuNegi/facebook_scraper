#!/usr/bin/env node
/**
 * Syncer Service Entry Point
 * 
 * Run: node src/services/syncer/index.js
 * or: npm run syncer
 */

require('dotenv').config();
const { createSyncer } = require('./syncer');
const { log } = require('../../utils/utils');

log('📝 Starting Syncer Service...');
log(`   Buffer size: ${process.env.SYNC_BUFFER_SIZE || '50'}`);
log(`   Flush interval: ${process.env.SYNC_FLUSH_INTERVAL_MS || '30000'}ms`);
log(`   Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);

// Create and start syncer
const syncer = createSyncer();

log('✅ Syncer service running. Buffering results...');
log('   Press Ctrl+C to stop (will flush buffer on exit)');
