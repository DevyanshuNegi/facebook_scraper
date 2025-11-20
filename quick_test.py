#!/usr/bin/env python3
"""
Direct test of the optimized Facebook scraper
"""
import asyncio
import time
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from optimized_scraper import get_scraper_instance

async def test_optimized_scraper():
    """Test the optimized scraper directly"""
    print("🚀 Testing Optimized Facebook Scraper")
    print("=" * 50)
    
    test_url = "https://www.facebook.com/skinplusfindon/"
    print(f"Target URL: {test_url}\n")
    
    # Test 1: Single URL performance
    print("1. Single URL Test:")
    print("-" * 20)
    
    start_time = time.time()
    scraper = await get_scraper_instance('fb_cookies.json')
    result = await scraper.scrape_email_fast(test_url)
    total_time = time.time() - start_time
    
    print(f"✅ Email found: {result.email}")
    print(f"📊 Internal processing time: {result.processing_time:.2f}s")
    print(f"📊 Total time (including setup): {total_time:.2f}s")
    if result.error:
        print(f"⚠️  Error: {result.error}")
    print()
    
    # Test 2: Multiple calls (warm cache)
    print("2. Warm Cache Test (3 more calls):")
    print("-" * 35)
    
    times = []
    for i in range(3):
        start_time = time.time()
        result = await scraper.scrape_email_fast(test_url)
        call_time = time.time() - start_time
        times.append(call_time)
        
        print(f"   Call {i+1}: {call_time:.2f}s (internal: {result.processing_time:.2f}s)")
    
    avg_time = sum(times) / len(times)
    print(f"   Average: {avg_time:.2f}s")
    print()
    
    # Test 3: Batch processing
    print("3. Batch Processing Test:")
    print("-" * 25)
    
    test_urls = [
        "https://www.facebook.com/skinplusfindon/",
        "https://www.facebook.com/coca-cola/",
        "https://www.facebook.com/nike/"
    ]
    
    start_time = time.time()
    batch_results = await scraper.scrape_multiple_urls(test_urls)
    batch_time = time.time() - start_time
    
    successful = 0
    for i, result in enumerate(batch_results):
        status = "✅" if result.email else "❌"
        print(f"   {status} URL {i+1}: {result.email or 'No email'} ({result.processing_time:.2f}s)")
        if result.email:
            successful += 1
    
    print(f"📊 Batch total time: {batch_time:.2f}s")
    print(f"📊 Average per URL: {batch_time/len(test_urls):.2f}s")
    print(f"📊 Success rate: {successful}/{len(test_urls)} ({successful/len(test_urls)*100:.1f}%)")
    print()
    
    # Performance summary
    print("🎯 PERFORMANCE SUMMARY:")
    print("=" * 50)
    print(f"🔥 First call: {total_time:.2f}s")
    print(f"🚀 Warm calls: {avg_time:.2f}s average")
    print(f"⚡ Batch processing: {batch_time/len(test_urls):.2f}s per URL")
    
    if avg_time < 3.0:
        print("✅ Performance target achieved! (<3s per request)")
    else:
        print("⚠️  Performance could be improved")
    
    print("\n💡 OPTIMIZATION TIPS:")
    print("- Use batch processing for multiple URLs")
    print("- Keep the browser instance alive between requests") 
    print("- Cache results for frequently requested URLs")
    print("- Consider using async endpoints for best performance")
    
    return result.email

if __name__ == "__main__":
    try:
        email = asyncio.run(test_optimized_scraper())
        print(f"\n🎉 Test completed! Sample email: {email}")
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()