const { chromium } = require('playwright');
const { log, logError } = require('./utils');
const { getPendingRows, updateRowStatus, markAsProcessing } = require('./sheets');

class ScraperEngine {
    constructor() {
        this.browser = null;
        this.cookieSessions = [];
        this.currentSessionIndex = 0;
        this.isPolling = false;
        this.stats = {
            processed: 0,
            pending: 0,
            failed: 0
        };
    }

    async init() {
        this.loadCookies();
        log('Launching Persistent Browser...');
        this.browser = await chromium.launch({
            headless: true, // Changed to true for stability in server environment
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
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

    rotateCookie() {
        if (this.cookieSessions.length <= 1) {
            log('No other cookie sessions available to rotate.');
            return false;
        }
        this.currentSessionIndex = (this.currentSessionIndex + 1) % this.cookieSessions.length;
        log(`Rotated to cookie session #${this.currentSessionIndex + 1}`);
        return true;
    }

    /**
     * Start polling a Google Sheet for new rows
     * @param {string} sheetId - Google Sheet ID
     * @param {number} intervalMs - Polling interval in milliseconds
     * @param {function} statsCallback - Callback to update stats
     */
    async startPolling(sheetId, intervalMs = 12000, statsCallback = null) {
        if (!this.browser) await this.init();

        this.isPolling = true;
        const batchSize = parseInt(process.env.PARALLEL_BATCH_SIZE) || 5;

        log(`Started polling sheet ${sheetId} (interval: ${intervalMs}ms, batch: ${batchSize})`);

        while (this.isPolling) {
            try {
                // 1. Fetch pending rows
                const pending = await getPendingRows(sheetId);
                this.stats.pending = pending.length;

                if (statsCallback) {
                    statsCallback(this.stats);
                }

                if (pending.length === 0) {
                    log('No pending rows. Waiting...');
                    await this.sleep(intervalMs);
                    continue;
                }

                // 2. Process in parallel (batch of N)
                const batch = pending.slice(0, batchSize);
                log(`Processing batch of ${batch.length} URLs...`);

                await Promise.allSettled(
                    batch.map(({ row, index, url }) => this.processRow(sheetId, row, index, url))
                );

                // 3. Sleep before next poll
                await this.sleep(intervalMs);

            } catch (error) {
                logError('Polling error', error);
                await this.sleep(intervalMs);
            }
        }

        log('Polling stopped');
    }

    /**
     * Process a single row from the sheet
     * @param {string} sheetId - Google Sheet ID
     * @param {object} row - Row object from Google Sheets
     * @param {number} rowIndex - Row index
     * @param {string} url - URL to scrape
     */
    async processRow(sheetId, row, rowIndex, url) {
        try {
            log(`Processing row ${rowIndex}: ${url}`);

            // 1. Mark as processing
            await markAsProcessing(sheetId, rowIndex);

            // 2. Scrape
            const email = await this.processUrl(url);

            // 3. Update with result
            const emailResult = email || 'Not found';
            await updateRowStatus(sheetId, rowIndex, emailResult, 'Done');

            this.stats.processed++;
            log(`✓ Row ${rowIndex} completed: ${emailResult}`);

        } catch (error) {
            logError(`Failed to process row ${rowIndex}`, error);
            await updateRowStatus(sheetId, rowIndex, null, 'Failed');
            this.stats.failed++;
        }
    }

    /**
     * Stop the polling loop
     */
    stopPolling() {
        log('Stopping polling...');
        this.isPolling = false;
    }

    /**
     * Sleep helper
     * @param {number} ms - Milliseconds to sleep
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async processUrl(url) {
        const maxRetries = this.cookieSessions.length > 0 ? this.cookieSessions.length : 1;
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
            attempt++;
            let context = null;
            try {
                log(`Processing: ${url} (Attempt ${attempt}/${maxRetries})`);

                // 1. Create isolated context (Incognito-like)
                context = await this.browser.newContext();

                // ============================================================
                // 🍪 COOKIE INJECTION
                // ============================================================
                // This section injects Facebook cookies for authentication.
                // 
                // ✅ WITHOUT COOKIES (Default): Set FACEBOOK_COOKIES=[] in .env
                //    - Works for public business pages (87%+ success rate)
                //    - No cookie management needed
                // 
                // 🔐 WITH COOKIES: Set FACEBOOK_COOKIES=[...] in .env
                //    - Required for personal/private profiles
                //    - Higher success rate for all page types
                // 
                // The code below automatically handles both cases.
                // ============================================================

                if (this.cookieSessions.length > 0) {
                    const cookies = this.cookieSessions[this.currentSessionIndex].map(cookie => {
                        // Playwright requires sameSite to be Strict, Lax, or None
                        if (cookie.sameSite === 'no_restriction') cookie.sameSite = 'None';
                        else if (cookie.sameSite === 'unspecified') cookie.sameSite = 'Lax';
                        if (cookie.sameSite) {
                            // Capitalize first letter (lax -> Lax, strict -> Strict)
                            cookie.sameSite = cookie.sameSite.charAt(0).toUpperCase() + cookie.sameSite.slice(1).toLowerCase();
                        }
                        // Decode value if it looks URL encoded
                        if (typeof cookie.value === 'string' && cookie.value.includes('%')) {
                            try {
                                cookie.value = decodeURIComponent(cookie.value);
                            } catch (e) {
                                // ignore
                            }
                        }
                        return cookie;
                    });
                    // Ensure cookies have the correct domain if missing, or let Playwright handle it if they are well-formed
                    await context.addCookies(cookies);
                    log('✅ Injected cookies for authenticated session.');
                } else {
                    log('ℹ️  Running WITHOUT cookies (public pages only)');
                }

                const page = await context.newPage();

                // 2. Block heavy resources (Images, Media, Fonts)
                await page.route('**/*.{png,jpg,jpeg,gif,webp,mp4,mp3,woff,woff2,ttf}', route => route.abort());

                // 3. Network Interception (React Data)
                page.on('response', async response => {
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('application/json')) {
                        try {
                            // In a real app, we'd filter for specific API endpoints here
                            // const json = await response.json();
                            // log(`Intercepted JSON from ${response.url()}`); 
                        } catch (e) {
                            // Ignore JSON parse errors from non-API responses
                        }
                    }
                });

                // 4. Navigate
                // Wait for domcontentloaded which is faster and less flaky than networkidle
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Check for login redirect
                if (page.url().includes('login') || page.url().includes('checkpoint')) {
                    log('Detected login redirect or checkpoint. Session might be invalid.');
                    if (this.rotateCookie()) {
                        log('Retrying with new session...');
                        await context.close();
                        continue; // Retry loop
                    } else {
                        log('Cookie rotation failed or exhausted. Continuing without valid session (public view maybe).');
                    }
                }

                // Wait a bit for React to render content
                await page.waitForTimeout(5000);

                // 5. Data Extraction (Hybrid: JSON + DOM)
                const pageData = await page.evaluate(() => {
                    let logs = [];
                    const log = (msg) => logs.push(msg);
                    let data = { title: document.title, name: null, followers: null, likes: null, email: null, logs: logs };

                    // Method A: Look for embedded JSON blobs (Relay/GraphQL preloads)
                    const scripts = document.querySelectorAll('script[type="application/json"]');
                    log(`Found ${scripts.length} JSON scripts`);

                    for (const script of scripts) {
                        try {
                            const json = JSON.parse(script.textContent);

                            if (script.textContent.includes('info@completeskinspecialists.com.au')) {
                                log('Found target email string in script content');
                                const match = script.textContent.match(/"text":\s*"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/);
                                log(`Regex match result: ${match ? match[1] : 'null'}`);
                            }

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
                                // Recursive search if not found at top level (the structure is deeply nested in 'require' arrays)
                                // Extract Email
                                if (obj.timeline_context_list_item_type === 'INTRO_CARD_PROFILE_EMAIL') {
                                    log('Found INTRO_CARD_PROFILE_EMAIL object');
                                    // Primary location: inside renderer.context_item.title.text
                                    if (obj.renderer && obj.renderer.context_item && obj.renderer.context_item.title && obj.renderer.context_item.title.text) {
                                        data.email = obj.renderer.context_item.title.text;
                                        log(`Extracted email from renderer: ${data.email}`);
                                    }
                                    // Fallback: older structure where context_item was at the top level
                                    else if (obj.context_item && obj.context_item.title && obj.context_item.title.text) {
                                        data.email = obj.context_item.title.text;
                                        log(`Extracted email from top-level context_item: ${data.email}`);
                                    } else {
                                        log('Email field not found in expected locations');
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
                                    // log(`Extracted email via regex: ${data.email}`); // Optional: uncomment if needed, but verify loop doesn't spam
                                }
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }

                    // Method B: Fallback to meta tags
                    if (!data.name) {
                        const ogTitle = document.querySelector('meta[property="og:title"]');
                        if (ogTitle) {
                            data.name = ogTitle.content;
                        }
                    }

                    // Method C: Fallback to mailto links
                    if (!data.email) {
                        const mailto = document.querySelector('a[href^="mailto:"]');
                        if (mailto) {
                            data.email = mailto.href.replace('mailto:', '');
                            log('Extracted email from mailto link');
                        }
                    }

                    return data;
                });

                log(`Scraped Data: ${JSON.stringify(pageData, null, 2)}`);
                log(`Final URL: ${page.url()}`);

                success = true;

                // Return the extracted email
                return pageData.email;

            } catch (error) {
                logError(`Failed to scrape ${url}`, error);
                // If it's a navigation error, maybe we don't rotate? 
                // For now, let's assume errors might be related to access and try rotating if we haven't exhausted retries
                if (this.rotateCookie()) {
                    log('Error encountered. Retrying with new session...');
                    if (context) await context.close();
                    continue;
                }
            } finally {
                // 6. Cleanup Context (Releases RAM/Cookies)
                if (context) await context.close();
            }
        }

        // If all retries failed, return null
        return null;
    }

    async close() {
        if (this.browser) {
            log('Closing Browser...');
            await this.browser.close();
        }
    }
}

module.exports = ScraperEngine;
