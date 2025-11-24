require('dotenv').config();
const ScraperEngine = require('./scraper');
const { log, logError } = require('./utils');

const TARGET_URL = process.argv[2] || 'https://www.facebook.com/completeskinspecialists/';

async function runManualTest() {
    const scraper = new ScraperEngine();

    try {
        await scraper.init();
        log(`Testing scraper against: ${TARGET_URL}`);
        await scraper.processUrl(TARGET_URL);
        // We can't easily get the page instance from here to check URL without modifying scraper, 
        // but the logs should show if it rotated.
        // Let's rely on the logs for now.
        log('Test complete.');
    } catch (error) {
        logError('Test failed', error);
    } finally {
        await scraper.close();
    }
}

runManualTest();

