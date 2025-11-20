#!/usr/bin/env python3
"""
Bulk Facebook URL Scraper with Performance Tracking
Processes large datasets with detailed metrics and results saving
"""
import asyncio
import json
import time
import datetime
import sys
import os
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from optimized_scraper import get_scraper_instance, ScrapingResult

@dataclass
class BulkProcessingResult:
    url: str
    email: str | None
    success: bool
    processing_time: float
    error: str | None
    timestamp: str
    attempt: int

@dataclass
class PerformanceMetrics:
    total_urls: int
    successful_scrapes: int
    failed_scrapes: int
    total_processing_time: float
    average_time_per_url: float
    fastest_scrape: float
    slowest_scrape: float
    success_rate: float
    start_time: str
    end_time: str
    emails_found: List[str]
    unique_emails: int
    cache_efficiency: float

class BulkFacebookScraper:
    """High-performance bulk Facebook URL processor with comprehensive metrics"""
    
    def __init__(self):
        self.results: List[BulkProcessingResult] = []
        self.performance_metrics: PerformanceMetrics | None = None
        self.start_time = None
        self.end_time = None
        
    async def load_urls_from_file(self, file_path: str) -> List[str]:
        """Load URLs from JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                urls = json.load(f)
            
            # Clean and validate URLs
            clean_urls = []
            for url in urls:
                url = url.strip()
                if url and 'facebook.com' in url:
                    clean_urls.append(url)
            
            print(f"📊 Loaded {len(clean_urls)} valid Facebook URLs")
            return clean_urls
            
        except Exception as e:
            print(f"❌ Error loading URLs: {e}")
            return []
    
    async def process_urls_in_batches(self, urls: List[str], batch_size: int = 20) -> List[BulkProcessingResult]:
        """Process URLs in batches for optimal performance"""
        print(f"🚀 Processing {len(urls)} URLs in batches of {batch_size}")
        print("=" * 60)
        
        self.start_time = datetime.datetime.now()
        scraper = await get_scraper_instance('fb_cookies.json')
        all_results = []
        
        # Process in batches to avoid overwhelming the system
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(urls) + batch_size - 1) // batch_size
            
            print(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} URLs)")
            
            batch_start = time.time()
            
            # Process batch concurrently
            batch_results = await scraper.scrape_multiple_urls(batch)
            
            batch_time = time.time() - batch_start
            
            # Convert to BulkProcessingResult format
            for j, result in enumerate(batch_results):
                bulk_result = BulkProcessingResult(
                    url=result.url,
                    email=result.email,
                    success=result.email is not None,
                    processing_time=result.processing_time,
                    error=result.error,
                    timestamp=datetime.datetime.now().isoformat(),
                    attempt=1
                )
                all_results.append(bulk_result)
            
            # Batch statistics
            successful = len([r for r in batch_results if r.email])
            print(f"   ✅ Success: {successful}/{len(batch)} ({successful/len(batch)*100:.1f}%)")
            print(f"   ⏱️  Batch time: {batch_time:.2f}s (avg: {batch_time/len(batch):.2f}s per URL)")
            
            # Brief pause between batches to avoid rate limiting
            if i + batch_size < len(urls):
                print(f"   ⏸️  Cooling down for 2 seconds...")
                await asyncio.sleep(2)
            
            print()
        
        self.end_time = datetime.datetime.now()
        self.results = all_results
        return all_results
    
    def calculate_performance_metrics(self) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        if not self.results:
            return None
        
        successful = [r for r in self.results if r.success]
        failed = [r for r in self.results if not r.success]
        emails_found = [r.email for r in successful if r.email]
        unique_emails = list(set(emails_found))
        
        processing_times = [r.processing_time for r in self.results if r.processing_time > 0]
        total_time = (self.end_time - self.start_time).total_seconds()
        
        metrics = PerformanceMetrics(
            total_urls=len(self.results),
            successful_scrapes=len(successful),
            failed_scrapes=len(failed),
            total_processing_time=total_time,
            average_time_per_url=sum(processing_times) / len(processing_times) if processing_times else 0,
            fastest_scrape=min(processing_times) if processing_times else 0,
            slowest_scrape=max(processing_times) if processing_times else 0,
            success_rate=(len(successful) / len(self.results)) * 100,
            start_time=self.start_time.isoformat(),
            end_time=self.end_time.isoformat(),
            emails_found=emails_found,
            unique_emails=len(unique_emails),
            cache_efficiency=0.0  # Would be calculated with actual cache stats
        )
        
        self.performance_metrics = metrics
        return metrics
    
    def save_results_to_file(self, filename: str = None):
        """Save results to JSON file"""
        if filename is None:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"facebook_scraping_results_{timestamp}.json"
        
        # Prepare data structure
        output_data = {
            "metadata": {
                "processed_at": datetime.datetime.now().isoformat(),
                "total_urls": len(self.results),
                "data_source": "sampledata.json"
            },
            "performance_metrics": asdict(self.performance_metrics) if self.performance_metrics else None,
            "results": [asdict(result) for result in self.results],
            "summary": {
                "emails_by_domain": self._analyze_email_domains(),
                "top_processing_times": self._get_top_processing_times(),
                "error_analysis": self._analyze_errors()
            }
        }
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Results saved to: {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error saving results: {e}")
            return None
    
    def save_performance_report(self, filename: str = None):
        """Save detailed performance report"""
        if filename is None:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_report_{timestamp}.md"
        
        if not self.performance_metrics:
            print("❌ No performance metrics available")
            return None
        
        metrics = self.performance_metrics
        
        report = f"""# Facebook Scraper Performance Report
        
## 📊 Executive Summary
- **Total URLs Processed**: {metrics.total_urls:,}
- **Success Rate**: {metrics.success_rate:.1f}% ({metrics.successful_scrapes}/{metrics.total_urls})
- **Emails Found**: {len(metrics.emails_found)} ({metrics.unique_emails} unique)
- **Total Processing Time**: {metrics.total_processing_time:.2f} seconds
- **Average Time per URL**: {metrics.average_time_per_url:.2f} seconds

## ⏱️ Performance Metrics
- **Fastest Scrape**: {metrics.fastest_scrape:.2f}s
- **Slowest Scrape**: {metrics.slowest_scrape:.2f}s
- **Processing Started**: {metrics.start_time}
- **Processing Completed**: {metrics.end_time}

## 📈 Throughput Analysis
- **URLs per Minute**: {(metrics.total_urls / metrics.total_processing_time) * 60:.1f}
- **Estimated Daily Capacity**: {(metrics.total_urls / metrics.total_processing_time) * 86400:.0f} URLs
- **Efficiency Rating**: {'Excellent' if metrics.average_time_per_url < 2 else 'Good' if metrics.average_time_per_url < 5 else 'Needs Improvement'}

## 📧 Email Discovery
### Unique Domains Found
{self._format_email_domains()}

### Sample Emails Found
{self._format_sample_emails()}

## ⚠️ Error Analysis
{self._format_error_analysis()}

## 🚀 Performance Recommendations
{self._generate_recommendations()}

## 📝 Technical Details
- **Scraper Version**: Optimized Async v2.0
- **Batch Processing**: Enabled (20 URLs per batch)
- **Browser Reuse**: Enabled
- **Caching**: In-memory with 1-hour TTL
- **Concurrency**: Up to 15 simultaneous pages

---
*Report generated on {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*
"""
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(report)
            
            print(f"📄 Performance report saved to: {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Error saving report: {e}")
            return None
    
    def _analyze_email_domains(self) -> Dict[str, int]:
        """Analyze email domains found"""
        domains = {}
        for result in self.results:
            if result.email:
                domain = result.email.split('@')[1] if '@' in result.email else 'unknown'
                domains[domain] = domains.get(domain, 0) + 1
        return dict(sorted(domains.items(), key=lambda x: x[1], reverse=True))
    
    def _get_top_processing_times(self) -> List[Dict]:
        """Get top 10 slowest processing times"""
        sorted_results = sorted(self.results, key=lambda x: x.processing_time, reverse=True)
        return [
            {
                "url": r.url,
                "processing_time": r.processing_time,
                "success": r.success,
                "email": r.email
            }
            for r in sorted_results[:10]
        ]
    
    def _analyze_errors(self) -> Dict[str, int]:
        """Analyze error patterns"""
        errors = {}
        for result in self.results:
            if result.error:
                error_type = result.error.split(':')[0] if ':' in result.error else result.error
                errors[error_type] = errors.get(error_type, 0) + 1
        return dict(sorted(errors.items(), key=lambda x: x[1], reverse=True))
    
    def _format_email_domains(self) -> str:
        """Format email domains for report"""
        domains = self._analyze_email_domains()
        if not domains:
            return "No emails found"
        
        formatted = []
        for domain, count in list(domains.items())[:10]:
            formatted.append(f"- **{domain}**: {count} email(s)")
        
        return "\n".join(formatted)
    
    def _format_sample_emails(self) -> str:
        """Format sample emails for report"""
        emails = [r.email for r in self.results if r.email][:10]
        if not emails:
            return "No emails found"
        
        return "\n".join([f"- {email}" for email in emails])
    
    def _format_error_analysis(self) -> str:
        """Format error analysis for report"""
        errors = self._analyze_errors()
        if not errors:
            return "No errors encountered - excellent!"
        
        formatted = []
        for error, count in errors.items():
            percentage = (count / len(self.results)) * 100
            formatted.append(f"- **{error}**: {count} occurrences ({percentage:.1f}%)")
        
        return "\n".join(formatted)
    
    def _generate_recommendations(self) -> str:
        """Generate performance recommendations"""
        metrics = self.performance_metrics
        recommendations = []
        
        if metrics.success_rate < 80:
            recommendations.append("- Consider reviewing Facebook page structures for failed URLs")
            recommendations.append("- Implement retry logic for failed requests")
        
        if metrics.average_time_per_url > 3:
            recommendations.append("- Increase batch size to improve throughput")
            recommendations.append("- Consider using more aggressive timeouts")
        
        if metrics.unique_emails < metrics.successful_scrapes * 0.8:
            recommendations.append("- Review email extraction patterns for better accuracy")
        
        if not recommendations:
            recommendations.append("- Performance is optimal for current scale")
            recommendations.append("- Consider implementing result caching for production use")
        
        return "\n".join(recommendations) if recommendations else "Performance is excellent!"

async def main():
    """Main execution function"""
    print("🎯 Facebook Bulk Scraper with Performance Tracking")
    print("=" * 60)
    
    scraper = BulkFacebookScraper()
    
    # Load URLs from sample data
    urls = await scraper.load_urls_from_file('sampledata.json')
    
    if not urls:
        print("❌ No URLs loaded. Exiting.")
        return
    
    # Process URLs
    print(f"🚀 Starting bulk processing of {len(urls)} URLs...")
    results = await scraper.process_urls_in_batches(urls, batch_size=15)  # Smaller batches for stability
    
    # Calculate metrics
    print("📊 Calculating performance metrics...")
    metrics = scraper.calculate_performance_metrics()
    
    # Display summary
    print("\n" + "=" * 60)
    print("🎉 PROCESSING COMPLETED!")
    print("=" * 60)
    print(f"📊 Total URLs: {metrics.total_urls}")
    print(f"✅ Successful: {metrics.successful_scrapes} ({metrics.success_rate:.1f}%)")
    print(f"❌ Failed: {metrics.failed_scrapes}")
    print(f"📧 Emails found: {len(metrics.emails_found)} ({metrics.unique_emails} unique)")
    print(f"⏱️  Total time: {metrics.total_processing_time:.2f}s")
    print(f"⚡ Avg per URL: {metrics.average_time_per_url:.2f}s")
    print(f"🚀 Throughput: {(metrics.total_urls / metrics.total_processing_time) * 60:.1f} URLs/min")
    
    # Save results
    print(f"\n💾 Saving results...")
    results_file = scraper.save_results_to_file()
    report_file = scraper.save_performance_report()
    
    print(f"\n🎯 Files created:")
    print(f"   📊 Results: {results_file}")
    print(f"   📄 Report: {report_file}")
    
    # Show some sample results
    print(f"\n📧 Sample successful results:")
    successful_results = [r for r in results if r.success][:5]
    for i, result in enumerate(successful_results, 1):
        print(f"   {i}. {result.email} ({result.processing_time:.2f}s)")
    
    return metrics

if __name__ == "__main__":
    try:
        metrics = asyncio.run(main())
        print(f"\n🎉 Bulk processing completed successfully!")
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()