require('dotenv').config();
const { chromium } = require('playwright');
const { log, logError } = require('./utils');
const fs = require('fs');

class ScraperParallel {
    constructor(concurrency = 5) {
        this.browser = null;
        this.cookieSessions = [];
        this.currentSessionIndex = 0;
        this.concurrency = concurrency;
        this.results = [];
    }

    loadCookies() {
        try {
            const cookiesEnv = process.env.FACEBOOK_COOKIES;
            if (cookiesEnv) {
                this.cookieSessions = JSON.parse(cookiesEnv);
                log(`Loaded ${this.cookieSessions.length} cookie sessions.`);
            } else {
                log('No FACEBOOK_COOKIES found in environment.');
            }
        } catch (error) {
            logError('Failed to parse FACEBOOK_COOKIES', error);
        }
    }

    async init() {
        this.loadCookies();
        log('Launching Browser for Parallel Processing...');
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            log('Browser closed.');
        }
    }

    rotateCookie() {
        if (this.cookieSessions.length <= 1) {
            return this.currentSessionIndex;
        }
        this.currentSessionIndex = (this.currentSessionIndex + 1) % this.cookieSessions.length;
        return this.currentSessionIndex;
    }

    async processUrl(url, workerId) {
        const startTime = Date.now();
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        try {
            // Inject cookies
            const sessionIndex = workerId % this.cookieSessions.length;
            const cookies = this.cookieSessions[sessionIndex];

            if (cookies && cookies.length > 0) {
                const processedCookies = cookies.map(cookie => {
                    const processed = {
                        ...cookie,
                        value: decodeURIComponent(cookie.value)
                    };

                    // Fix sameSite attribute - Playwright only accepts Strict, Lax, or None
                    if (processed.sameSite && !['Strict', 'Lax', 'None'].includes(processed.sameSite)) {
                        processed.sameSite = 'Lax'; // Default to Lax for invalid values
                    }

                    return processed;
                });
                await context.addCookies(processedCookies);
            }

            const page = await context.newPage();

            // Block resources for performance
            await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            // Navigate to URL
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for React content to render
            await page.waitForTimeout(5000);

            // Extract data
            const pageData = await page.evaluate(() => {
                let data = { title: document.title, name: null, followers: null, likes: null, email: null };

                const scripts = document.querySelectorAll('script[type="application/json"]');

                for (const script of scripts) {
                    try {
                        const json = JSON.parse(script.textContent);

                        const findUser = (obj) => {
                            if (!obj || typeof obj !== 'object') return;

                            // Check for Profile Header (Name)
                            if (obj.profile_header_renderer) {
                                if (obj.profile_header_renderer.user && obj.profile_header_renderer.user.name) {
                                    data.name = obj.profile_header_renderer.user.name;
                                }
                            }

                            // Check for User (Name & Followers)
                            if (obj.user) {
                                const user = obj.user;
                                if (user.name) data.name = user.name;

                                // Social Context (Followers)
                                if (user.profile_social_context && user.profile_social_context.content) {
                                    const content = user.profile_social_context.content;
                                    for (const item of content) {
                                        if (item.text && item.text.text) {
                                            const text = item.text.text;
                                            if (text.includes('followers')) data.followers = text;
                                            if (text.includes('likes')) data.likes = text;
                                        }
                                    }
                                }
                            }

                            // Extract Email
                            if (obj.timeline_context_list_item_type === 'INTRO_CARD_PROFILE_EMAIL') {
                                if (obj.renderer && obj.renderer.context_item && obj.renderer.context_item.title && obj.renderer.context_item.title.text) {
                                    data.email = obj.renderer.context_item.title.text;
                                } else if (obj.context_item && obj.context_item.title && obj.context_item.title.text) {
                                    data.email = obj.context_item.title.text;
                                }
                            }

                            Object.values(obj).forEach(findUser);
                        };

                        findUser(json);

                        // Fallback: Regex search in the script content if structured search failed
                        if (!data.email) {
                            const emailMatch = script.textContent.match(/"text":\s*"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/);
                            if (emailMatch) {
                                data.email = emailMatch[1];
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }

                // Fallback to meta tags
                if (!data.name) {
                    const ogTitle = document.querySelector('meta[property="og:title"]');
                    if (ogTitle) {
                        data.name = ogTitle.content;
                    }
                }

                // Fallback to mailto links
                if (!data.email) {
                    const mailto = document.querySelector('a[href^="mailto:"]');
                    if (mailto) {
                        data.email = mailto.href.replace('mailto:', '');
                    }
                }

                return data;
            });

            await page.close();
            await context.close();

            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);

            return {
                url,
                name: pageData.name || '',
                followers: pageData.followers || '',
                likes: pageData.likes || '',
                email: pageData.email || '',
                status: pageData.name ? 'success' : 'failed',
                processingTime: processingTime + 's'
            };

        } catch (error) {
            logError(`Worker ${workerId} error for ${url}`, error);

            try {
                await context.close();
            } catch (closeError) {
                // Ignore close errors
            }

            const endTime = Date.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);

            return {
                url,
                name: '',
                followers: '',
                likes: '',
                email: '',
                status: 'error',
                processingTime: processingTime + 's',
                error: error.message
            };
        }
    }

    async scrapeBatchParallel(urls, outputCsvPath = 'scraped_results.csv') {
        const totalUrls = urls.length;
        let processed = 0;

        // Write CSV header
        const header = 'URL,Name,Followers,Likes,Email,Status,ProcessingTime\n';
        fs.writeFileSync(outputCsvPath, header);

        log(`Starting parallel processing of ${totalUrls} URLs with ${this.concurrency} workers...`);

        const startTime = Date.now();

        // Process URLs in batches
        for (let i = 0; i < urls.length; i += this.concurrency) {
            const batch = urls.slice(i, i + this.concurrency);
            const batchNumber = Math.floor(i / this.concurrency) + 1;
            const totalBatches = Math.ceil(urls.length / this.concurrency);

            log(`\nProcessing batch ${batchNumber}/${totalBatches} (${batch.length} URLs)...`);

            // Process batch concurrently
            const promises = batch.map((url, index) => {
                const workerId = i + index;
                log(`  [Worker ${workerId + 1}] Starting: ${url}`);
                return this.processUrl(url, workerId);
            });

            const results = await Promise.all(promises);

            // Write results to CSV
            results.forEach((result, index) => {
                const workerId = i + index;
                processed++;

                // Escape CSV fields
                const escapeCsv = (field) => {
                    if (!field) return '';
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                };

                const row = [
                    escapeCsv(result.url),
                    escapeCsv(result.name),
                    escapeCsv(result.followers),
                    escapeCsv(result.likes),
                    escapeCsv(result.email),
                    result.status,
                    result.processingTime
                ].join(',') + '\n';

                fs.appendFileSync(outputCsvPath, row);

                const statusIcon = result.status === 'success' ? '✓' : '✗';
                const emailInfo = result.email ? `Email: ${result.email}` : 'No email';
                log(`  [Worker ${workerId + 1}] ${statusIcon} ${result.status} (${result.processingTime}) - ${emailInfo}`);
            });

            const progress = ((processed / totalUrls) * 100).toFixed(1);
            log(`Progress: ${processed}/${totalUrls} (${progress}%)`);
        }

        const endTime = Date.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2);
        const avgTime = (totalTime / totalUrls).toFixed(2);

        log('\n' + '='.repeat(80));
        log('PARALLEL PROCESSING COMPLETE');
        log('='.repeat(80));
        log(`Total URLs:           ${totalUrls}`);
        log(`Successful:           ${this.results.filter(r => r.status === 'success').length}`);
        log(`Total Time:           ${totalTime}s (${(totalTime / 60).toFixed(2)} minutes)`);
        log(`Average per URL:      ${avgTime}s`);
        log(`Speedup vs Sequential: ~${(this.concurrency).toFixed(1)}x faster`);
        log(`Results saved to:     ${outputCsvPath}`);
        log('='.repeat(80));

        return this.results;
    }
}

module.exports = ScraperParallel;
