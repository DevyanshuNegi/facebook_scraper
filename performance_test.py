#!/usr/bin/env python3
"""
Performance test script for the optimized Facebook scraper
"""
import asyncio
import time
import requests
import json
from optimized_scraper import get_scraper_instance

async def test_single_url_performance():
    """Test performance of single URL scraping"""
    test_url = "https://www.facebook.com/skinplusfindon/"
    
    print("🚀 Testing Single URL Performance...")
    print(f"URL: {test_url}\n")
    
    # Test 1: Cold start (first run)
    print("1. Cold Start Test:")
    start_time = time.time()
    scraper = await get_scraper_instance('fb_cookies.json')
    result = await scraper.scrape_email_fast(test_url)
    cold_time = time.time() - start_time
    
    print(f"   Email found: {result.email}")
    print(f"   Processing time: {cold_time:.2f}s")
    print(f"   Internal time: {result.processing_time:.2f}s")
    print()
    
    # Test 2: Warm runs (browser already initialized)
    print("2. Warm Runs Test (5 consecutive calls):")
    warm_times = []
    
    for i in range(5):
        start_time = time.time()
        result = await scraper.scrape_email_fast(test_url)
        warm_time = time.time() - start_time
        warm_times.append(warm_time)
        
        print(f"   Run {i+1}: {warm_time:.2f}s (internal: {result.processing_time:.2f}s)")
    
    avg_warm = sum(warm_times) / len(warm_times)
    print(f"   Average warm time: {avg_warm:.2f}s")
    print()
    
    return cold_time, avg_warm, result.email

async def test_batch_performance():
    """Test performance of batch URL scraping"""
    test_urls = [
        "https://www.facebook.com/skinplusfindon/",
        "https://www.facebook.com/coca-cola/",
        "https://www.facebook.com/nike/",
        "https://www.facebook.com/starbucks/",
        "https://www.facebook.com/microsoft/"
    ]
    
    print("🔥 Testing Batch Performance...")
    print(f"URLs: {len(test_urls)} total\n")
    
    # Sequential processing (old way)
    print("1. Sequential Processing:")
    scraper = await get_scraper_instance('fb_cookies.json')
    
    start_time = time.time()
    sequential_results = []
    for url in test_urls:
        result = await scraper.scrape_email_fast(url)
        sequential_results.append(result)
    sequential_time = time.time() - start_time
    
    successful_sequential = len([r for r in sequential_results if r.email])
    print(f"   Total time: {sequential_time:.2f}s")
    print(f"   Time per URL: {sequential_time/len(test_urls):.2f}s")
    print(f"   Emails found: {successful_sequential}/{len(test_urls)}")
    print()
    
    # Concurrent processing (optimized way)
    print("2. Concurrent Processing:")
    start_time = time.time()
    concurrent_results = await scraper.scrape_multiple_urls(test_urls)
    concurrent_time = time.time() - start_time
    
    successful_concurrent = len([r for r in concurrent_results if r.email])
    print(f"   Total time: {concurrent_time:.2f}s")
    print(f"   Time per URL: {concurrent_time/len(test_urls):.2f}s")
    print(f"   Emails found: {successful_concurrent}/{len(test_urls)}")
    print()
    
    speedup = sequential_time / concurrent_time
    print(f"📈 Speedup: {speedup:.1f}x faster")
    print()
    
    return sequential_time, concurrent_time, speedup

def test_api_performance():
    """Test the Flask API performance"""
    base_url = "http://localhost:8080"
    
    print("🌐 Testing API Performance...")
    print("Make sure the server is running: python optimized_main.py\n")
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health")
        if response.status_code != 200:
            print("❌ Server not responding")
            return
        
        # Test single URL
        print("1. Single URL API Test:")
        test_data = {"url": "https://www.facebook.com/skinplusfindon/"}
        
        start_time = time.time()
        response = requests.post(f"{base_url}/scrape", json=test_data)
        api_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Email found: {result.get('email')}")
            print(f"   API response time: {api_time:.2f}s")
            print(f"   Server processing time: {result.get('processing_time', 0):.2f}s")
            print(f"   Cached: {result.get('cached', False)}")
        else:
            print(f"   ❌ Error: {response.status_code}")
        print()
        
        # Test batch API
        print("2. Batch API Test:")
        batch_data = {
            "urls": [
                "https://www.facebook.com/skinplusfindon/",
                "https://www.facebook.com/coca-cola/",
                "https://www.facebook.com/nike/"
            ]
        }
        
        start_time = time.time()
        response = requests.post(f"{base_url}/scrape-batch", json=batch_data)
        batch_api_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Total URLs: {result.get('total_urls')}")
            print(f"   Successful: {result.get('successful_scrapes')}")
            print(f"   Cached: {result.get('cached_results')}")
            print(f"   API response time: {batch_api_time:.2f}s")
            print(f"   Server processing time: {result.get('total_processing_time', 0):.2f}s")
        else:
            print(f"   ❌ Error: {response.status_code}")
        print()
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running on port 8080")

async def main():
    """Run all performance tests"""
    print("=" * 60)
    print("🎯 FACEBOOK SCRAPER PERFORMANCE TESTS")
    print("=" * 60)
    print()
    
    # Test single URL performance
    cold_time, warm_time, email = await test_single_url_performance()
    
    # Test batch performance
    seq_time, conc_time, speedup = await test_batch_performance()
    
    # Test API performance
    test_api_performance()
    
    # Summary
    print("=" * 60)
    print("📊 PERFORMANCE SUMMARY")
    print("=" * 60)
    print(f"Cold start time: {cold_time:.2f}s")
    print(f"Warm run average: {warm_time:.2f}s")
    print(f"Batch speedup: {speedup:.1f}x")
    print(f"Sample email found: {email}")
    print()
    
    improvement = (4.0 - warm_time) / 4.0 * 100  # Assuming original was ~4-16s
    print(f"🚀 Estimated improvement: {improvement:.0f}% faster than original")
    print(f"📈 Recommended: Use batch endpoint for multiple URLs")
    print(f"💾 Caching: Subsequent requests to same URLs will be instant")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())