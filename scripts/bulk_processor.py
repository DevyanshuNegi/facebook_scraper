"""
Bulk Facebook URL processing script with performance tracking
"""
import json
import time
import datetime
import asyncio
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict

# Add parent src directory to path
import sys
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from scraper.core import get_scraper_instance
from scraper.models import ScrapingResult, BulkProcessingResult, PerformanceMetrics
from scraper.config import default_config


class BulkFacebookProcessor:
    """High-performance bulk Facebook URL processor"""
    
    def __init__(self):
        self.results: List[BulkProcessingResult] = []
        self.performance_metrics: PerformanceMetrics = None
        self.start_time = None
        self.end_time = None
    
    async def load_urls_from_file(self, file_path: str = None) -> List[str]:
        """Load URLs from sample data file"""
        if file_path is None:
            file_path = default_config.get_absolute_path("data/sample/sampledata.json")
        
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
    
    async def process_urls_in_batches(self, urls: List[str]) -> List[BulkProcessingResult]:
        """Process URLs in batches for optimal performance"""
        print(f"🚀 Processing {len(urls)} URLs in batches of {default_config.batch_size}")
        print("=" * 60)
        
        self.start_time = datetime.datetime.now()
        cookie_path = default_config.get_absolute_path(default_config.cookies_file)
        scraper = await get_scraper_instance(cookie_path)
        all_results = []
        
        # Process in batches to avoid overwhelming the system
        for i in range(0, len(urls), default_config.batch_size):
            batch = urls[i:i + default_config.batch_size]
            batch_num = (i // default_config.batch_size) + 1
            total_batches = (len(urls) + default_config.batch_size - 1) // default_config.batch_size
            
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
            if i + default_config.batch_size < len(urls):
                print(f"   ⏸️  Cooling down for {default_config.batch_cooldown} seconds...")
                await asyncio.sleep(default_config.batch_cooldown)
            
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
    
    def save_results(self) -> tuple[str, str]:
        """Save results and performance report"""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create results directory if it doesn't exist
        results_dir = Path(default_config.get_absolute_path("data/results"))
        results_dir.mkdir(parents=True, exist_ok=True)
        
        # Save JSON results
        results_file = results_dir / f"facebook_scraping_results_{timestamp}.json"
        output_data = {
            "metadata": {
                "processed_at": datetime.datetime.now().isoformat(),
                "total_urls": len(self.results),
                "data_source": "data/sample/sampledata.json",
                "version": "2.0.0"
            },
            "performance_metrics": asdict(self.performance_metrics) if self.performance_metrics else None,
            "results": [asdict(result) for result in self.results],
        }
        
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        # Save markdown report
        report_file = results_dir / f"performance_report_{timestamp}.md"
        report_content = self._generate_report()
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(results_file), str(report_file)
    
    def _generate_report(self) -> str:
        """Generate detailed performance report"""
        if not self.performance_metrics:
            return "No performance metrics available"
        
        m = self.performance_metrics
        
        return f"""# Facebook Scraper Performance Report

## 📊 Executive Summary
- **Total URLs Processed**: {m.total_urls:,}
- **Success Rate**: {m.success_rate:.1f}% ({m.successful_scrapes}/{m.total_urls})
- **Emails Found**: {len(m.emails_found)} ({m.unique_emails} unique)
- **Total Processing Time**: {m.total_processing_time:.2f} seconds ({m.total_processing_time/60:.1f} minutes)
- **Average Time per URL**: {m.average_time_per_url:.2f} seconds

## ⏱️ Performance Metrics
- **Fastest Scrape**: {m.fastest_scrape:.2f}s
- **Slowest Scrape**: {m.slowest_scrape:.2f}s
- **Processing Started**: {m.start_time}
- **Processing Completed**: {m.end_time}

## 📈 Throughput Analysis
- **URLs per Minute**: {(m.total_urls / m.total_processing_time) * 60:.1f}
- **Estimated Daily Capacity**: {(m.total_urls / m.total_processing_time) * 86400:.0f} URLs
- **Efficiency Rating**: {'Excellent' if m.average_time_per_url < 2 else 'Good' if m.average_time_per_url < 5 else 'Needs Improvement'}

## 📧 Email Discovery
### Sample Emails Found
{self._format_sample_emails()}

## 🚀 Technical Specifications
- **Scraper Version**: 2.0.0 (Optimized Async)
- **Batch Processing**: {default_config.batch_size} URLs per batch
- **Browser Reuse**: Enabled (Connection Pooling)
- **Concurrent Pages**: {default_config.max_concurrent_pages}
- **Caching**: {'Enabled' if default_config.enable_caching else 'Disabled'}

---
*Report generated on {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*
"""
    
    def _format_sample_emails(self) -> str:
        """Format sample emails for report"""
        if not self.performance_metrics or not self.performance_metrics.emails_found:
            return "No emails found"
        
        emails = self.performance_metrics.emails_found[:10]
        return "\n".join([f"- {email}" for email in emails])
    
    async def process_sample_data(self):
        """Main processing method for sample data"""
        print("🎯 Facebook Bulk URL Processor v2.0")
        print("=" * 60)
        
        # Load URLs
        urls = await self.load_urls_from_file()
        if not urls:
            print("❌ No URLs to process")
            return
        
        # Process URLs
        results = await self.process_urls_in_batches(urls)
        
        # Calculate metrics
        metrics = self.calculate_performance_metrics()
        
        # Save results
        results_file, report_file = self.save_results()
        
        # Display summary
        print("\n" + "=" * 60)
        print("🎉 PROCESSING COMPLETED!")
        print("=" * 60)
        print(f"📊 Total URLs: {metrics.total_urls}")
        print(f"✅ Successful: {metrics.successful_scrapes} ({metrics.success_rate:.1f}%)")
        print(f"❌ Failed: {metrics.failed_scrapes}")
        print(f"📧 Emails found: {len(metrics.emails_found)} ({metrics.unique_emails} unique)")
        print(f"⏱️  Total time: {metrics.total_processing_time:.2f}s ({metrics.total_processing_time/60:.1f} minutes)")
        print(f"⚡ Avg per URL: {metrics.average_time_per_url:.2f}s")
        print(f"🚀 Throughput: {(metrics.total_urls / metrics.total_processing_time) * 60:.1f} URLs/min")
        
        print(f"\n💾 Results saved:")
        print(f"   📊 JSON: {results_file}")
        print(f"   📄 Report: {report_file}")
        
        # Show sample results
        successful_results = [r for r in results if r.success][:5]
        if successful_results:
            print(f"\n📧 Sample successful extractions:")
            for i, result in enumerate(successful_results, 1):
                print(f"   {i}. {result.email} ({result.processing_time:.2f}s)")
        
        print("\n" + "=" * 60)