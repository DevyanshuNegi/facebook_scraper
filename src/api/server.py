"""
Flask API for Facebook scraper
Provides REST endpoints for single and batch email scraping operations
"""
import os
import asyncio
import time
import json
from flask import Flask, request, jsonify
import threading
from typing import List, Dict
from dataclasses import asdict

from scraper.core import get_scraper_instance, OptimizedFacebookScraper
from scraper.models import ScrapingResult
from scraper.config import default_config


class FacebookScraperAPI:
    """Flask API wrapper for the Facebook scraper"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.cache = {}
        self.cache_lock = threading.Lock()
        self.cache_expiry = default_config.cache_expiry
        
        # Register routes
        self._register_routes()
    
    def _register_routes(self):
        """Register all API routes"""
        self.app.add_url_rule('/scrape', 'scrape', self.scrape, methods=['POST'])
        self.app.add_url_rule('/scrape-batch', 'scrape_batch', self.scrape_batch, methods=['POST'])
        self.app.add_url_rule('/cache-stats', 'cache_stats', self.cache_stats, methods=['GET'])
        self.app.add_url_rule('/clear-cache', 'clear_cache', self.clear_cache, methods=['POST'])
        self.app.add_url_rule('/health', 'health', self.health, methods=['GET'])
        self.app.add_url_rule('/performance-test', 'performance_test', self.performance_test, methods=['POST'])
    
    def get_from_cache(self, url: str) -> tuple:
        """Get result from cache if not expired"""
        if not default_config.enable_caching:
            return None, False
            
        with self.cache_lock:
            if url in self.cache:
                result, timestamp = self.cache[url]
                if time.time() - timestamp < self.cache_expiry:
                    return result, True
                else:
                    del self.cache[url]
        return None, False
    
    def add_to_cache(self, url: str, result: dict):
        """Add result to cache"""
        if not default_config.enable_caching:
            return
            
        with self.cache_lock:
            self.cache[url] = (result, time.time())
    
    def run_async(self, coro):
        """Run async function in a new thread with dedicated event loop"""
        def run_in_thread():
            # Create a completely fresh event loop in this thread
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                return new_loop.run_until_complete(coro)
            finally:
                new_loop.close()
        
        # Use threading to run async code in isolation
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_thread)
            return future.result(timeout=120)  # 2 minute timeout
    
    def scrape(self):
        """Single URL scraping endpoint with caching"""
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({"error": "URL is required"}), 400

        fb_url = data['url']
        
        # Check cache first
        cached_result, found = self.get_from_cache(fb_url)
        if found:
            return jsonify({
                "email": cached_result["email"],
                "url": fb_url,
                "processing_time": cached_result["processing_time"],
                "cached": True
            })
        
        try:
            # Run async scraping with fresh scraper instance
            async def scrape_single():
                cookie_path = default_config.get_absolute_path(default_config.cookies_file)
                # Create a new scraper instance for this request to avoid conflicts
                scraper = OptimizedFacebookScraper(default_config)
                try:
                    await scraper.initialize(cookie_path)
                    result = await scraper.scrape_email_fast(fb_url)
                    return result
                finally:
                    await scraper.close()
            
            result = self.run_async(scrape_single())
            
            response_data = {
                "email": result.email,
                "url": result.url,
                "processing_time": result.processing_time,
                "cached": False,
                "error": result.error
            }
            
            # Cache successful results
            if result.email:
                self.add_to_cache(fb_url, {
                    "email": result.email,
                    "processing_time": result.processing_time
                })
            
            if result.email:
                return jsonify(response_data)
            else:
                return jsonify(response_data), 404
                
        except Exception as e:
            return jsonify({
                "error": str(e),
                "url": fb_url,
                "processing_time": 0
            }), 500
    
    def scrape_batch(self):
        """Batch URL scraping endpoint for maximum throughput"""
        data = request.get_json()
        if not data or 'urls' not in data:
            return jsonify({"error": "URLs array is required"}), 400
        
        urls = data['urls']
        if not isinstance(urls, list) or len(urls) == 0:
            return jsonify({"error": "URLs must be a non-empty array"}), 400
        
        if len(urls) > default_config.max_batch_size:
            return jsonify({"error": f"Maximum {default_config.max_batch_size} URLs per batch"}), 400
        
        start_time = time.time()
        
        try:
            # Check cache for all URLs first
            results = []
            uncached_urls = []
            
            for url in urls:
                cached_result, found = self.get_from_cache(url)
                if found:
                    results.append({
                        "email": cached_result["email"],
                        "url": url,
                        "processing_time": cached_result["processing_time"],
                        "cached": True,
                        "error": None
                    })
                else:
                    uncached_urls.append(url)
            
            # Process uncached URLs concurrently
            if uncached_urls:
                async def scrape_multiple():
                    cookie_path = default_config.get_absolute_path(default_config.cookies_file)
                    # Create a new scraper instance for this batch
                    scraper = OptimizedFacebookScraper(default_config)
                    try:
                        await scraper.initialize(cookie_path)
                        scraping_results = await scraper.scrape_multiple_urls(uncached_urls)
                        return scraping_results
                    finally:
                        await scraper.close()
                
                scraping_results = self.run_async(scrape_multiple())
                
                # Add results and cache successful ones
                for result in scraping_results:
                    response_item = {
                        "email": result.email,
                        "url": result.url,
                        "processing_time": result.processing_time,
                        "cached": False,
                        "error": result.error
                    }
                    results.append(response_item)
                    
                    # Cache successful results
                    if result.email:
                        self.add_to_cache(result.url, {
                            "email": result.email,
                            "processing_time": result.processing_time
                        })
            
            total_time = time.time() - start_time
            
            # Sort results to match input order
            url_to_result = {r["url"]: r for r in results}
            ordered_results = [url_to_result[url] for url in urls]
            
            return jsonify({
                "results": ordered_results,
                "total_urls": len(urls),
                "total_processing_time": total_time,
                "successful_scrapes": len([r for r in ordered_results if r["email"]]),
                "cached_results": len([r for r in ordered_results if r["cached"]])
            })
            
        except Exception as e:
            return jsonify({
                "error": str(e),
                "total_processing_time": time.time() - start_time
            }), 500
    
    def cache_stats(self):
        """Get cache statistics"""
        with self.cache_lock:
            total_entries = len(self.cache)
            current_time = time.time()
            expired_entries = sum(1 for _, timestamp in self.cache.values() if current_time - timestamp >= self.cache_expiry)
            active_entries = total_entries - expired_entries
        
        return jsonify({
            "total_entries": total_entries,
            "active_entries": active_entries,
            "expired_entries": expired_entries,
            "cache_expiry_seconds": self.cache_expiry,
            "caching_enabled": default_config.enable_caching
        })
    
    def clear_cache(self):
        """Clear the cache"""
        with self.cache_lock:
            self.cache.clear()
        return jsonify({"message": "Cache cleared successfully"})
    
    def health(self):
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "timestamp": time.time(),
            "version": "2.0.0"
        })
    
    def performance_test(self):
        """Test endpoint for performance benchmarking"""
        data = request.get_json()
        test_urls = data.get('urls', ['https://www.facebook.com/skinplusfindon/'])
        iterations = data.get('iterations', 1)
        
        if iterations > 10:
            return jsonify({"error": "Maximum 10 iterations allowed"}), 400
        
        results = []
        
        for i in range(iterations):
            start_time = time.time()
            
            try:
                async def test_scrape():
                    cookie_path = default_config.get_absolute_path(default_config.cookies_file)
                    scraper = await get_scraper_instance(cookie_path)
                    test_results = await scraper.scrape_multiple_urls(test_urls)
                    return test_results
                
                test_results = self.run_async(test_scrape())
                iteration_time = time.time() - start_time
                
                results.append({
                    "iteration": i + 1,
                    "processing_time": iteration_time,
                    "urls_processed": len(test_urls),
                    "successful": len([r for r in test_results if r.email]),
                    "avg_time_per_url": iteration_time / len(test_urls)
                })
                
            except Exception as e:
                results.append({
                    "iteration": i + 1,
                    "error": str(e),
                    "processing_time": time.time() - start_time
                })
        
        avg_time = sum(r.get("processing_time", 0) for r in results) / len(results)
        
        return jsonify({
            "results": results,
            "average_processing_time": avg_time,
            "total_iterations": iterations
        })
    
    def run(self, host=None, port=None, debug=False):
        """Run the Flask application"""
        host = host or default_config.api_host
        port = port or default_config.api_port
        self.app.run(debug=debug, host=host, port=port, threaded=True)


def create_app():
    """Application factory pattern"""
    api = FacebookScraperAPI()
    return api.app