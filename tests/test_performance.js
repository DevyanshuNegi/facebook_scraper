require('dotenv').config();
const fs = require('fs');
const ScraperEngine = require('./scraper');
const { log, logError } = require('./utils');

async function main() {
    const scraper = new ScraperEngine();

    // Read URLs from CSV
    const csvContent = fs.readFileSync('sheet1.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const urls = lines.slice(1).map(line => line.trim().replace('\r', '')).filter(url => url.startsWith('http'));

    log(`Found ${urls.length} URLs to process`);

    // Performance metrics
    const metrics = {
        totalUrls: urls.length,
        successCount: 0,
        failureCount: 0,
        emailFoundCount: 0,
        totalTime: 0,
        urlTimes: [],
        results: []
    };

    const startTime = Date.now();

    try {
        await scraper.init();

        // Process each URL
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const urlStartTime = Date.now();

            log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

            try {
                const result = await scraper.processUrl(url);
                const urlEndTime = Date.now();
                const urlTime = (urlEndTime - urlStartTime) / 1000; // in seconds

                metrics.urlTimes.push(urlTime);

                if (result && result.name) {
                    metrics.successCount++;
                    if (result.email) {
                        metrics.emailFoundCount++;
                    }
                    metrics.results.push({
                        url,
                        success: true,
                        time: urlTime,
                        hasEmail: !!result.email,
                        data: result
                    });
                    log(`✓ Success (${urlTime.toFixed(2)}s) - Email: ${result.email || 'N/A'}`);
                } else {
                    metrics.failureCount++;
                    metrics.results.push({
                        url,
                        success: false,
                        time: urlTime,
                        hasEmail: false
                    });
                    log(`✗ Failed (${urlTime.toFixed(2)}s)`);
                }
            } catch (error) {
                const urlEndTime = Date.now();
                const urlTime = (urlEndTime - urlStartTime) / 1000;

                metrics.failureCount++;
                metrics.urlTimes.push(urlTime);
                metrics.results.push({
                    url,
                    success: false,
                    time: urlTime,
                    hasEmail: false,
                    error: error.message
                });
                logError(`✗ Error (${urlTime.toFixed(2)}s)`, error);
            }
        }

    } catch (error) {
        logError('Fatal Error', error);
    } finally {
        await scraper.close();
    }

    const endTime = Date.now();
    metrics.totalTime = (endTime - startTime) / 1000; // in seconds

    // Calculate statistics
    const avgTimePerUrl = metrics.urlTimes.length > 0
        ? metrics.urlTimes.reduce((a, b) => a + b, 0) / metrics.urlTimes.length
        : 0;
    const successRate = (metrics.successCount / metrics.totalUrls) * 100;
    const emailFoundRate = (metrics.emailFoundCount / metrics.totalUrls) * 100;

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE METRICS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total URLs Processed:     ${metrics.totalUrls}`);
    console.log(`Successful:               ${metrics.successCount} (${successRate.toFixed(2)}%)`);
    console.log(`Failed:                   ${metrics.failureCount} (${(100 - successRate).toFixed(2)}%)`);
    console.log(`Emails Found:             ${metrics.emailFoundCount} (${emailFoundRate.toFixed(2)}%)`);
    console.log(`Total Time:               ${metrics.totalTime.toFixed(2)}s (${(metrics.totalTime / 60).toFixed(2)} minutes)`);
    console.log(`Average Time per URL:     ${avgTimePerUrl.toFixed(2)}s`);
    console.log(`Min Time:                 ${Math.min(...metrics.urlTimes).toFixed(2)}s`);
    console.log(`Max Time:                 ${Math.max(...metrics.urlTimes).toFixed(2)}s`);
    console.log('='.repeat(80));

    // Save detailed results to JSON
    const reportPath = 'performance_report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
        summary: {
            totalUrls: metrics.totalUrls,
            successCount: metrics.successCount,
            failureCount: metrics.failureCount,
            emailFoundCount: metrics.emailFoundCount,
            successRate: successRate.toFixed(2) + '%',
            emailFoundRate: emailFoundRate.toFixed(2) + '%',
            totalTime: metrics.totalTime.toFixed(2) + 's',
            avgTimePerUrl: avgTimePerUrl.toFixed(2) + 's',
            minTime: Math.min(...metrics.urlTimes).toFixed(2) + 's',
            maxTime: Math.max(...metrics.urlTimes).toFixed(2) + 's'
        },
        results: metrics.results
    }, null, 2));

    log(`\nDetailed report saved to: ${reportPath}`);
}

main();
