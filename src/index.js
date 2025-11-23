require('dotenv').config();
const { startServer } = require('./server');
const { log } = require('./utils');

async function main() {
    const port = process.env.PORT || 3000;

    log('🚀 Starting Facebook Scraper API...');
    await startServer(port);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
