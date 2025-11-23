require('dotenv').config();
const fs = require('fs');
const ScraperParallel = require('./scraper_parallel');
const { log } = require('./utils');

async function main() {
    // Read URLs from CSV
    const csvContent = fs.readFileSync('sheet1.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const urls = lines.slice(1).map(line => line.trim().replace('\r', '')).filter(url => url.startsWith('http'));

    log(`Found ${urls.length} URLs to process in parallel`);

    const scraper = new ScraperParallel(5); // 5 concurrent workers

    try {
        await scraper.init();
        await scraper.scrapeBatchParallel(urls, 'scraped_results.csv');
    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await scraper.close();
    }
}

main();
