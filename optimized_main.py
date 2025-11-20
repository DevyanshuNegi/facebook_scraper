import os
import asyncio
import time
from flask import Flask, request, jsonify
from optimized_scraper import get_scraper_instance, ScrapingResult
import threading
from typing import List, Dict
import json

app = Flask(__name__)

# Simple in-memory cache
cache = {}
cache_lock = threading.Lock()
CACHE_EXPIRY = 3600  # 1 hour

def get_from_cache(url: str) -> tuple:
    """Get result from cache if not expired"""
    with cache_lock:
        if url in cache:
            result, timestamp = cache[url]
            if time.time() - timestamp < CACHE_EXPIRY:
                return result, True
            else:
                del cache[url]
    return None, False

def add_to_cache(url: str, result: dict):
    """Add result to cache"""
    with cache_lock:
        cache[url] = (result, time.time())

def run_async(coro):
    """Run async function in a new thread to avoid blocking Flask"""
    def run_in_thread():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    # Use threading to run async code
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(run_in_thread)
        return future.result()

@app.route('/scrape', methods=['POST'])
def scrape():
    """Single URL scraping endpoint with caching"""
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "URL is required"}), 400

    fb_url = data['url']
    
    # Check cache first
    cached_result, found = get_from_cache(fb_url)
    if found:
        return jsonify({
            "email": cached_result["email"],
            "url": fb_url,
            "processing_time": cached_result["processing_time"],
            "cached": True
        })
    
    try:
        # Run async scraping
        async def scrape_single():
            scraper = await get_scraper_instance('fb_cookies.json')
            result = await scraper.scrape_email_fast(fb_url)
            return result
        
        result = run_async(scrape_single())
        
        response_data = {
            "email": result.email,
            "url": result.url,
            "processing_time": result.processing_time,
            "cached": False,
            "error": result.error
        }
        
        # Cache successful results
        if result.email:
            add_to_cache(fb_url, {
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

@app.route('/scrape-batch', methods=['POST'])
def scrape_batch():
    """Batch URL scraping endpoint for maximum throughput"""
    data = request.get_json()
    if not data or 'urls' not in data:
        return jsonify({"error": "URLs array is required"}), 400
    
    urls = data['urls']
    if not isinstance(urls, list) or len(urls) == 0:
        return jsonify({"error": "URLs must be a non-empty array"}), 400
    
    if len(urls) > 50:  # Reasonable limit
        return jsonify({"error": "Maximum 50 URLs per batch"}), 400
    
    start_time = time.time()
    
    try:
        # Check cache for all URLs first
        results = []
        uncached_urls = []
        
        for url in urls:
            cached_result, found = get_from_cache(url)
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
                scraper = await get_scraper_instance('fb_cookies.json')
                scraping_results = await scraper.scrape_multiple_urls(uncached_urls)
                return scraping_results
            
            scraping_results = run_async(scrape_multiple())
            
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
                    add_to_cache(result.url, {
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

@app.route('/cache-stats', methods=['GET'])
def cache_stats():
    """Get cache statistics"""
    with cache_lock:
        total_entries = len(cache)
        current_time = time.time()
        expired_entries = sum(1 for _, timestamp in cache.values() if current_time - timestamp >= CACHE_EXPIRY)
        active_entries = total_entries - expired_entries
    
    return jsonify({
        "total_entries": total_entries,
        "active_entries": active_entries,
        "expired_entries": expired_entries,
        "cache_expiry_seconds": CACHE_EXPIRY
    })

@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Clear the cache"""
    with cache_lock:
        cache.clear()
    return jsonify({"message": "Cache cleared successfully"})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time()
    })

# Performance monitoring endpoint
@app.route('/performance-test', methods=['POST'])
def performance_test():
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
                scraper = await get_scraper_instance('fb_cookies.json')
                test_results = await scraper.scrape_multiple_urls(test_urls)
                return test_results
            
            test_results = run_async(test_scrape())
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

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), threaded=True)