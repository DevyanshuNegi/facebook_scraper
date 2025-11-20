"""
Core Facebook scraper implementation with optimized performance
"""
import json
import re
import asyncio
import time
from typing import Optional, Dict, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import threading

from .models import ScrapingResult
from .config import ScraperConfig, default_config


class OptimizedFacebookScraper:
    """
    High-performance Facebook scraper with connection pooling and async operations.
    Designed for massive scale scraping with minimal overhead.
    """
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or default_config
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.cookies_loaded = False
        self.page_pool = asyncio.Queue(maxsize=self.config.max_concurrent_pages)
        self.semaphore = asyncio.Semaphore(self.config.max_concurrent_pages)
        self._lock = asyncio.Lock()
    
    async def initialize(self, cookie_file_path: str = None):
        """Initialize browser instance and load cookies once"""
        if cookie_file_path is None:
            cookie_file_path = self.config.get_absolute_path(self.config.cookies_file)
        
        if self.browser is None:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=self.config.headless,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            )
            
            # Load cookies once
            try:
                with open(cookie_file_path, 'r') as f:
                    cookies = json.load(f)
            except FileNotFoundError:
                raise FileNotFoundError(f"Cookies file not found: {cookie_file_path}")
            
            # Fix sameSite values
            for cookie in cookies:
                if 'sameSite' in cookie:
                    if cookie['sameSite'] in ['no_restriction', 'unspecified']:
                        cookie['sameSite'] = 'None'
                    elif cookie['sameSite'] == 'lax':
                        cookie['sameSite'] = 'Lax'
                    elif cookie['sameSite'] == 'strict':
                        cookie['sameSite'] = 'Strict'
            
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            await self.context.add_cookies(cookies)
            
            # Pre-populate page pool
            for _ in range(self.config.max_concurrent_pages):
                page = await self.context.new_page()
                await self.page_pool.put(page)
            
            self.cookies_loaded = True
    
    async def get_page(self) -> Page:
        """Get a page from the pool"""
        return await self.page_pool.get()
    
    async def return_page(self, page: Page):
        """Return a page to the pool"""
        try:
            # Clear page state for reuse
            await page.goto('about:blank')
            await self.page_pool.put(page)
        except:
            # If page is broken, create a new one
            try:
                await page.close()
            except:
                pass
            new_page = await self.context.new_page()
            await self.page_pool.put(new_page)
    
    def extract_emails_from_text(self, text: str) -> List[str]:
        """Extract emails using multiple regex patterns"""
        emails = set()
        for pattern in self.config.email_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                email = match.group(1) if match.lastindex and match.lastindex > 0 else match.group(0)
                # Basic validation
                if '@' in email and '.' in email.split('@')[1]:
                    emails.add(email.lower())
        return list(emails)
    
    async def scrape_email_fast(self, fb_url: str) -> ScrapingResult:
        """
        Fast email scraping with optimized selectors and minimal page loading
        """
        start_time = time.time()
        
        async with self.semaphore:  # Limit concurrent operations
            page = await self.get_page()
            
            try:
                # Try multiple URL variations for better success rate
                urls_to_try = [
                    f"{fb_url.rstrip('/')}/about",
                    f"{fb_url.rstrip('/')}/about_details", 
                    f"{fb_url.rstrip('/')}/about/contact_and_basic_info",
                    fb_url.rstrip('/')
                ]
                
                emails_found = set()
                
                for url in urls_to_try:
                    try:
                        # Fast navigation with minimal wait
                        await page.goto(url, wait_until='domcontentloaded', timeout=self.config.page_timeout)
                        
                        # 1. Quick targeted selector search (fastest)
                        for selector in self.config.email_selectors[:3]:  # Only check first 3 selectors for speed
                            try:
                                elements = await page.locator(selector).all()
                                for element in elements:
                                    text = await element.inner_text()
                                    href = await element.get_attribute('href')
                                    
                                    if href and href.startswith('mailto:'):
                                        email = href.replace('mailto:', '').strip()
                                        if '@' in email:
                                            emails_found.add(email.lower())
                                    
                                    emails = self.extract_emails_from_text(text)
                                    emails_found.update(emails)
                                    
                                if emails_found:
                                    break
                            except:
                                continue
                        
                        # 2. If no emails found, quick text search in contact sections
                        if not emails_found:
                            try:
                                # Look for contact/about sections specifically
                                contact_sections = await page.locator('[data-testid*="about"], [data-testid*="contact"], div:has-text("Contact"), div:has-text("About")').all()
                                
                                for section in contact_sections[:5]:  # Limit to first 5 sections
                                    text = await section.inner_text()
                                    emails = self.extract_emails_from_text(text)
                                    emails_found.update(emails)
                                    
                                    if emails_found:
                                        break
                            except:
                                pass
                        
                        # If emails found, no need to try other URLs
                        if emails_found:
                            break
                            
                    except Exception as e:
                        continue
                
                # If still no emails, fallback to full page text (slower)
                if not emails_found:
                    try:
                        # Only get visible text to reduce processing time
                        body_text = await page.locator('body').inner_text()
                        emails_found.update(self.extract_emails_from_text(body_text))
                    except:
                        pass
                
                processing_time = time.time() - start_time
                
                if emails_found:
                    # Return the first valid email found
                    best_email = next(iter(emails_found))
                    return ScrapingResult(
                        email=best_email,
                        url=fb_url,
                        processing_time=processing_time
                    )
                else:
                    return ScrapingResult(
                        email=None,
                        url=fb_url,
                        processing_time=processing_time,
                        error="No email found"
                    )
                    
            except Exception as e:
                processing_time = time.time() - start_time
                return ScrapingResult(
                    email=None,
                    url=fb_url,
                    processing_time=processing_time,
                    error=str(e)
                )
            finally:
                await self.return_page(page)
    
    async def scrape_multiple_urls(self, urls: List[str]) -> List[ScrapingResult]:
        """
        Scrape multiple URLs concurrently for maximum throughput
        """
        tasks = [self.scrape_email_fast(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(ScrapingResult(
                    email=None,
                    url=urls[i],
                    processing_time=0,
                    error=str(result)
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def close(self):
        """Clean up resources"""
        if self.browser:
            await self.browser.close()


# Singleton instance for reuse across requests
_scraper_instance = None
_scraper_lock = threading.Lock()


async def get_scraper_instance(cookie_file_path: str = None, config: ScraperConfig = None) -> OptimizedFacebookScraper:
    """Get or create singleton scraper instance"""
    global _scraper_instance
    
    if _scraper_instance is None:
        with _scraper_lock:
            if _scraper_instance is None:
                _scraper_instance = OptimizedFacebookScraper(config or default_config)
                await _scraper_instance.initialize(cookie_file_path)
    
    return _scraper_instance


# Backwards compatibility function
async def get_email_from_page_optimized(fb_url: str, cookie_file_path: str = None) -> Optional[str]:
    """Optimized version of the original function with async support"""
    scraper = await get_scraper_instance(cookie_file_path)
    result = await scraper.scrape_email_fast(fb_url)
    return result.email


# Sync wrapper for backwards compatibility
def get_email_from_page_sync(fb_url: str, cookie_file_path: str = None) -> Optional[str]:
    """Synchronous wrapper for the optimized function"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new event loop in a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, get_email_from_page_optimized(fb_url, cookie_file_path))
                return future.result()
        else:
            return loop.run_until_complete(get_email_from_page_optimized(fb_url, cookie_file_path))
    except RuntimeError:
        return asyncio.run(get_email_from_page_optimized(fb_url, cookie_file_path))