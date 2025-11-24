require('dotenv').config();
const fs = require('fs');
const ScraperParallel = require('./scraper_parallel');
const { log } = require('./utils');

async function main() {
    // Read URLs from CSV
    const csvContent = fs.readFileSync('sheet1.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const allUrls = lines.slice(1).map(line => line.trim().replace('\r', '')).filter(url => url.startsWith('http'));

    // Take only first 10 URLs for testing
    const urls = allUrls.slice(0, 10);

    log(`Testing with ${urls.length} URLs (first 10 from sheet1.csv)`);

    const scraper = new ScraperParallel(5); // 5 concurrent workers

    try {
        await scraper.init();
        await scraper.scrapeBatchParallel(urls, 'test_results.csv');

        log('\n✓ Test completed successfully!');
        log('Check test_results.csv for output');
    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await scraper.close();
    }
}

main();
