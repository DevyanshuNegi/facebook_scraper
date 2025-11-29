/**
 * Worker Service - Consumes scraping jobs from queue
 * 
 * Flow:
 * 1. Consume job from scrape-queue
 * 2. Scrape the URL using existing scraper logic
 * 3. Push result to results-queue (NOT to Google Sheets)
 * 4. Mark job as complete
 */

const { Worker } = require('bullmq');
const { connection } = require('../../config/redis');
const { resultsQueue } = require('../../queues');
const { log, logError } = require('../../utils/utils');
const playwright = require('playwright');

// Browser pool - reuse browsers for performance
let browserPool = {
    browser: null,
    isInitialized: false
};

/**
 * Initialize persistent browser
 */
async function initBrowser() {
    if (browserPool.isInitialized && browserPool.browser) {
        return browserPool.browser;
    }

    log('[Worker] Launching persistent browser...');
    browserPool.browser = await playwright.chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    browserPool.isInitialized = true;
    log('[Worker] Browser ready');
    return browserPool.browser;
}

/**
 * Scrape a single URL
 * Reuses existing scraping logic from scraper.js
 */
async function scrapeUrl(url) {
    const browser = await initBrowser();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    let email = null;
    let status = 'Done';
    let page = null;

    try {
        // Load cookies if available
        const cookiesEnv = process.env.FACEBOOK_COOKIES;
        if (cookiesEnv) {
            try {
                let cookiesArray = JSON.parse(cookiesEnv);

                // Handle nested arrays (common user error: [[{...}]])
                if (Array.isArray(cookiesArray) && Array.isArray(cookiesArray[0])) {
                    log('[Worker] Detected nested cookie array, flattening...');
                    cookiesArray = cookiesArray.flat();
                }

                if (Array.isArray(cookiesArray) && cookiesArray.length > 0) {
                    // Sanitize cookies for Playwright
                    const sanitizedCookies = cookiesArray.map(cookie => {
                        const newCookie = { ...cookie };
                        if (newCookie.sameSite === 'no_restriction') newCookie.sameSite = 'None';
                        if (newCookie.sameSite === 'unspecified') newCookie.sameSite = 'Lax';
                        return newCookie;
                    });

                    log(`[Worker] Injecting ${sanitizedCookies.length} cookies...`);
                    await context.addCookies(sanitizedCookies);
                    log('[Worker] Cookies injected successfully');
                }
            } catch (error) {
                logError('[Worker] Failed to parse/inject cookies', error);
            }
        }

        page = await context.newPage();

        // Block unnecessary resources for performance
        await page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        // Navigate and scrape
        // Navigate and scrape
        log(`[Worker] Scraping: ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle', // Wait for network to be idle (better for SPAs)
            timeout: 60000 // Increased timeout
        });

        // Wait for React to render (increased to 5s)
        await page.waitForTimeout(5000);

        // Extract email using network interception
        const scriptTags = await page.$$('script[type="application/json"]');

        for (const script of scriptTags) {
            const content = await script.textContent();
            if (!content) continue;

            try {
                const data = JSON.parse(content);
                const dataStr = JSON.stringify(data);

                // Look for email patterns
                const emailMatch = dataStr.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                if (emailMatch) {
                    email = emailMatch[1];
                    log(`[Worker] Found email: ${email}`);
                    break;
                }
            } catch (e) {
                // Invalid JSON, skip
            }
        }

        if (!email) {
            status = 'Not found';
            log(`[Worker] No email found for: ${url}`);

            // Debug: Save HTML to see what we actually got
            try {
                const html = await page.content();
                const safeUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
                const dumpPath = `debug-${safeUrl}-${Date.now()}.html`;
                const fs = require('fs');
                fs.writeFileSync(dumpPath, html);
                log(`[Worker] 📄 Saved HTML dump to ${dumpPath}`);
            } catch (e) {
                logError('[Worker] Failed to save HTML dump', e);
            }
        }

    } catch (error) {
        logError(`[Worker] Scraping error for ${url}`, error);
        status = 'Failed';

        // Capture screenshot on failure for debugging
        try {
            const screenshotPath = `error-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath });
            log(`[Worker] 📸 Screenshot saved to ${screenshotPath}`);
        } catch (e) {
            logError('[Worker] Failed to save screenshot', e);
        }
    } finally {
        await context.close();
    }

    return { email, status };
}

/**
 * Job processor function
 */
async function processJob(job) {
    log(`[Worker] Processing job ${job.id}: ${job.data.url}`);

    const { url, rowIndex, sheetId } = job.data;

    // Scrape the URL
    const { email, status } = await scrapeUrl(url);

    // Push result to results-queue (NOT to Google Sheets)
    const result = {
        rowIndex,
        sheetId,
        url,
        email: email || 'Not found',
        status,
        scrapedAt: new Date().toISOString()
    };

    await resultsQueue.add('write-result', result, {
        jobId: `result-${sheetId}-row-${rowIndex}`,
    });

    log(`[Worker] ✅ Job ${job.id} complete. Result pushed to results-queue.`);

    return result;
}

/**
 * Create and start the worker
 */
function createWorker() {
    const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);

    const worker = new Worker('scrape-queue', processJob, {
        connection,
        concurrency, // Process N jobs in parallel
        limiter: {
            max: 10,      // Max 10 jobs
            duration: 1000 // Per second
        }
    });

    // Event listeners
    worker.on('completed', (job, result) => {
        log(`[Worker] ✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
        logError(`[Worker] ❌ Job ${job?.id} failed`, error);
    });

    worker.on('error', (error) => {
        logError('[Worker] Worker error', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        log('[Worker] SIGTERM received, closing worker...');
        await worker.close();
        if (browserPool.browser) {
            await browserPool.browser.close();
        }
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        log('[Worker] SIGINT received, closing worker...');
        await worker.close();
        if (browserPool.browser) {
            await browserPool.browser.close();
        }
        process.exit(0);
    });

    log(`[Worker] Started with concurrency: ${concurrency}`);

    return worker;
}

module.exports = { createWorker, initBrowser, scrapeUrl };
