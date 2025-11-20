#!/usr/bin/env python3
"""
Results Summary and Analysis Script
Quick overview of the bulk scraping results
"""
import json
from datetime import datetime

def analyze_results():
    """Analyze the bulk scraping results"""
    print("=" * 60)
    print("🎯 FACEBOOK BULK SCRAPING RESULTS SUMMARY")
    print("=" * 60)
    
    # Load results
    try:
        with open('facebook_scraping_results_20251116_120414.json', 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ Results file not found")
        return
    
    metrics = data['performance_metrics']
    results = data['results']
    
    print(f"📊 PROCESSING OVERVIEW:")
    print(f"   • Total URLs processed: {metrics['total_urls']}")
    print(f"   • Processing time: {metrics['total_processing_time']:.1f} seconds ({metrics['total_processing_time']/60:.1f} minutes)")
    print(f"   • Average per URL: {metrics['average_time_per_url']:.2f} seconds")
    print(f"   • Throughput: {metrics['total_urls'] / (metrics['total_processing_time']/60):.1f} URLs per minute")
    print()
    
    print(f"✅ SUCCESS METRICS:")
    print(f"   • Success rate: {metrics['success_rate']:.1f}% ({metrics['successful_scrapes']}/{metrics['total_urls']})")
    print(f"   • Emails found: {len(metrics['emails_found'])}")
    print(f"   • Unique emails: {metrics['unique_emails']}")
    print(f"   • Failed scrapes: {metrics['failed_scrapes']}")
    print()
    
    print(f"⚡ PERFORMANCE STATS:")
    print(f"   • Fastest scrape: {metrics['fastest_scrape']:.2f}s")
    print(f"   • Slowest scrape: {metrics['slowest_scrape']:.2f}s")
    print(f"   • Speed range: {metrics['slowest_scrape'] / metrics['fastest_scrape']:.1f}x variation")
    print()
    
    # Analyze email domains
    email_domains = {}
    for email in metrics['emails_found']:
        if '@' in email:
            domain = email.split('@')[1]
            email_domains[domain] = email_domains.get(domain, 0) + 1
    
    print(f"📧 EMAIL DOMAIN ANALYSIS:")
    sorted_domains = sorted(email_domains.items(), key=lambda x: x[1], reverse=True)
    for domain, count in sorted_domains[:10]:
        print(f"   • {domain}: {count} emails")
    print()
    
    # Business email analysis
    business_domains = [d for d, c in sorted_domains if not d.endswith('.com') or 'dermatology' in d or 'skin' in d]
    print(f"📈 BUSINESS INTELLIGENCE:")
    print(f"   • Business email domains: {len(business_domains)}")
    print(f"   • Generic email providers: {email_domains.get('gmail.com', 0) + email_domains.get('yahoo.com', 0) + email_domains.get('hotmail.com', 0)}")
    print(f"   • Professional ratio: {(len(business_domains) / len(sorted_domains) * 100):.1f}%")
    print()
    
    # Performance comparison with original
    print(f"🚀 PERFORMANCE vs ORIGINAL:")
    original_estimate = metrics['total_urls'] * 8  # Assuming 8s average for original
    improvement = ((original_estimate - metrics['total_processing_time']) / original_estimate) * 100
    print(f"   • Estimated original time: {original_estimate/60:.1f} minutes")
    print(f"   • Actual optimized time: {metrics['total_processing_time']/60:.1f} minutes")
    print(f"   • Time saved: {(original_estimate - metrics['total_processing_time'])/60:.1f} minutes")
    print(f"   • Performance improvement: {improvement:.1f}%")
    print()
    
    # Recommendations
    print(f"💡 RECOMMENDATIONS FOR MASSIVE SCALE:")
    print(f"   • Current capacity: ~{(metrics['total_urls'] / (metrics['total_processing_time']/3600)):.0f} URLs/hour")
    print(f"   • Daily potential: ~{(metrics['total_urls'] / (metrics['total_processing_time']/86400)):.0f} URLs/day")
    print(f"   • For 100K URLs: ~{(100000 * metrics['average_time_per_url']/3600):.1f} hours needed")
    print(f"   • Recommend: Multiple instances + result caching + retry logic")
    print()
    
    # Show some successful results
    print(f"📋 SAMPLE SUCCESSFUL EXTRACTIONS:")
    successful_results = [r for r in results if r['success']][:10]
    for i, result in enumerate(successful_results, 1):
        domain = result['url'].split('/')[-2] if '/' in result['url'] else result['url']
        print(f"   {i:2d}. {result['email']} (from {domain}) - {result['processing_time']:.2f}s")
    
    print("\n" + "=" * 60)
    print(f"💾 Detailed results saved in:")
    print(f"   📊 facebook_scraping_results_20251116_120414.json")
    print(f"   📄 performance_report_20251116_120414.md")
    print("=" * 60)

if __name__ == "__main__":
    analyze_results()