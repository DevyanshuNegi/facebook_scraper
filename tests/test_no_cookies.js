// Quick test script to try scraping without cookies
require('dotenv').config();
const ScraperEngine = require('./scraper');
const { log } = require('./utils');

async function testNoCookies() {
    // Temporarily override cookies to empty
    const originalCookies = process.env.FACEBOOK_COOKIES;
    process.env.FACEBOOK_COOKIES = '[]';

    const scraper = new ScraperEngine();

    const testUrls = [
        // 'https://facebook.com/meta',        // Public page
        // 'https://facebook.com/facebook',    // Public page
        // 'https://facebook.com/zuck'         // Public profile
        'https://www.facebook.com/heidelbergderm/',
        'https://www.facebook.com/completeskinspecialists/',
        'https://www.facebook.com/skinplusfindon/',
        'https://www.facebook.com/100063619750971/',
        'https://www.facebook.com/p/Foley-Dermatology-Associates-61573760490264/',
        'https://www.facebook.com/100064059904278/',
        'https://www.facebook.com/riversdaledermatology/',
        'https://www.facebook.com/drportiamillardermatology/'
    ];

    try {
        log('🧪 Testing scraper WITHOUT cookies...');
        log('─'.repeat(60));

        await scraper.init();

        for (const url of testUrls) {
            log(`\n📄 Testing: ${url}`);
            const result = await scraper.processUrl(url);

            if (result) {
                log(`✅ Email found: ${result}`);
            } else {
                log(`⚠️  No email found (expected without cookies)`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await scraper.close();
        // Restore original cookies
        process.env.FACEBOOK_COOKIES = originalCookies;

        log('\n' + '─'.repeat(60));
        log('📊 Test complete!');
        log('\n💡 Observations:');
        log('   - If redirected to login: Facebook requires authentication');
        log('   - If page loads: Check browser screenshots for what loaded');
        log('   - No email found is expected for most pages without cookies');
    }
}

testNoCookies();
