# Facebook Scraper Performance Report
        
## 📊 Executive Summary
- **Total URLs Processed**: 107
- **Success Rate**: 75.7% (81/107)
- **Emails Found**: 81 (78 unique)
- **Total Processing Time**: 245.60 seconds
- **Average Time per URL**: 2.30 seconds

## ⏱️ Performance Metrics
- **Fastest Scrape**: 2.04s
- **Slowest Scrape**: 46.59s
- **Processing Started**: 2025-11-16T12:00:08.649419
- **Processing Completed**: 2025-11-16T12:04:14.249926

## 📈 Throughput Analysis
- **URLs per Minute**: 26.1
- **Estimated Daily Capacity**: 37642 URLs
- **Efficiency Rating**: Needs Improvement

## 📧 Email Discovery
### Unique Domains Found
- **gmail.com**: 5 email(s)
- **melbourneskin.com**: 2 email(s)
- **healthmattersgroup.com.au**: 2 email(s)
- **kynetonmedical.com.au**: 2 email(s)
- **heidelbergdermatology.com.au**: 1 email(s)
- **completeskinspecialists.com.au**: 1 email(s)
- **skinplus.com.au**: 1 email(s)
- **nsdermatology.com.au**: 1 email(s)
- **foleydermatology.com.au**: 1 email(s)
- **riversdaledermatology.com.au**: 1 email(s)

### Sample Emails Found
- reception@heidelbergdermatology.com.au
- referral@completeskinspecialists.com.au
- admin@skinplus.com.au
- reception@nsdermatology.com.au
- reception@foleydermatology.com.au
- reception@riversdaledermatology.com.au
- appointments@drportiamillar.com.au
- reception@northsidedermatology.com.au
- reception@skindepth.com.au
- dermatology@div.net.au

## ⚠️ Error Analysis
- **No email found**: 26 occurrences (24.3%)

## 🚀 Performance Recommendations
- Consider reviewing Facebook page structures for failed URLs
- Implement retry logic for failed requests
- Increase batch size to improve throughput
- Consider using more aggressive timeouts

## 📝 Technical Details
- **Scraper Version**: Optimized Async v2.0
- **Batch Processing**: Enabled (20 URLs per batch)
- **Browser Reuse**: Enabled
- **Caching**: In-memory with 1-hour TTL
- **Concurrency**: Up to 15 simultaneous pages

---
*Report generated on 2025-11-16 12:04:14*
