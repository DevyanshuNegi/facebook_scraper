# Facebook Scraper API Documentation

Complete REST API reference for the Facebook Email Scraper.

## 📡 Base URL

```
http://localhost:8080
```

## 🔐 Authentication

No authentication required for API endpoints. Authentication is handled via Facebook cookies configured in the server.

## 📊 Response Format

All responses are in JSON format with consistent structure:

```json
{
  "email": "string|null",
  "url": "string", 
  "processing_time": "float",
  "cached": "boolean",
  "error": "string|null"
}
```

## 🛠️ API Endpoints

### 1. Single URL Scraping

Extract email from a single Facebook page URL.

**Endpoint:** `POST /scrape`

**Request Body:**
```json
{
  "url": "https://www.facebook.com/skinplusfindon/"
}
```

**Response (Success):**
```json
{
  "email": "admin@skinplus.com.au",
  "url": "https://www.facebook.com/skinplusfindon/",
  "processing_time": 1.82,
  "cached": false,
  "error": null
}
```

**Response (No Email Found):**
```json
{
  "email": null,
  "url": "https://www.facebook.com/skinplusfindon/",
  "processing_time": 2.15,
  "cached": false,
  "error": "No email found"
}
```

**Response (Cached Result):**
```json
{
  "email": "admin@skinplus.com.au",
  "url": "https://www.facebook.com/skinplusfindon/",
  "processing_time": 1.82,
  "cached": true,
  "error": null
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/scrape \\
     -H "Content-Type: application/json" \\
     -d '{"url": "https://www.facebook.com/skinplusfindon/"}'
```

---

### 2. Batch URL Scraping

Process multiple Facebook URLs concurrently for maximum throughput.

**Endpoint:** `POST /scrape-batch`

**Request Body:**
```json
{
  "urls": [
    "https://www.facebook.com/skinplusfindon/",
    "https://www.facebook.com/coca-cola/",
    "https://www.facebook.com/nike/"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "email": "admin@skinplus.com.au",
      "url": "https://www.facebook.com/skinplusfindon/",
      "processing_time": 1.82,
      "cached": false,
      "error": null
    },
    {
      "email": null,
      "url": "https://www.facebook.com/coca-cola/",
      "processing_time": 3.45,
      "cached": false,
      "error": "No email found"
    },
    {
      "email": "contact@nike.com",
      "url": "https://www.facebook.com/nike/",
      "processing_time": 2.15,
      "cached": true,
      "error": null
    }
  ],
  "total_urls": 3,
  "total_processing_time": 8.42,
  "successful_scrapes": 2,
  "cached_results": 1
}
```

**Limits:**
- Maximum 50 URLs per batch (configurable)
- Results returned in same order as input URLs

**cURL Example:**
```bash
curl -X POST http://localhost:8080/scrape-batch \\
     -H "Content-Type: application/json" \\
     -d '{
       "urls": [
         "https://www.facebook.com/skinplusfindon/",
         "https://www.facebook.com/coca-cola/"
       ]
     }'
```

---

### 3. Cache Statistics

Get information about the result cache performance.

**Endpoint:** `GET /cache-stats`

**Response:**
```json
{
  "total_entries": 150,
  "active_entries": 142,
  "expired_entries": 8,
  "cache_expiry_seconds": 3600,
  "caching_enabled": true
}
```

**cURL Example:**
```bash
curl http://localhost:8080/cache-stats
```

---

### 4. Clear Cache

Clear all cached results to force fresh scraping.

**Endpoint:** `POST /clear-cache`

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/clear-cache
```

---

### 5. Health Check

Check if the API server is running and responsive.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1700000000.0,
  "version": "2.0.0"
}
```

**cURL Example:**
```bash
curl http://localhost:8080/health
```

---

### 6. Performance Test

Run performance benchmarks to test scraper speed and reliability.

**Endpoint:** `POST /performance-test`

**Request Body:**
```json
{
  "urls": ["https://www.facebook.com/skinplusfindon/"],
  "iterations": 3
}
```

**Response:**
```json
{
  "results": [
    {
      "iteration": 1,
      "processing_time": 2.15,
      "urls_processed": 1,
      "successful": 1,
      "avg_time_per_url": 2.15
    },
    {
      "iteration": 2,
      "processing_time": 1.82,
      "urls_processed": 1,
      "successful": 1,
      "avg_time_per_url": 1.82
    },
    {
      "iteration": 3,
      "processing_time": 1.95,
      "urls_processed": 1,
      "successful": 1,
      "avg_time_per_url": 1.95
    }
  ],
  "average_processing_time": 1.97,
  "total_iterations": 3
}
```

**Limits:**
- Maximum 10 iterations per test
- Test URLs default to sample URL if not provided

**cURL Example:**
```bash
curl -X POST http://localhost:8080/performance-test \\
     -H "Content-Type: application/json" \\
     -d '{
       "urls": ["https://www.facebook.com/skinplusfindon/"],
       "iterations": 3
     }'
```

## ⚠️ Error Responses

### HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Email found and returned |
| 404 | Not Found | No email found on page |
| 400 | Bad Request | Missing or invalid URL |
| 500 | Server Error | Internal processing error |

### Error Response Format

```json
{
  "error": "Error description",
  "url": "https://www.facebook.com/example/",
  "processing_time": 0.5
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "URL is required" | Missing URL in request | Include 'url' field in JSON |
| "URLs array is required" | Missing URLs in batch request | Include 'urls' array in JSON |
| "Maximum X URLs per batch" | Too many URLs in batch | Reduce number of URLs |
| "No email found" | No email detected on page | Page may not contain email |
| "Timeout error" | Page took too long to load | Try again or increase timeout |
| "Cookie authentication failed" | Facebook cookies expired | Update cookies file |

## 🚀 Performance Guidelines

### Response Times

| Scenario | Expected Time | Notes |
|----------|---------------|-------|
| First Request (Cold Start) | 5-10 seconds | Browser initialization |
| Cached Result | <100ms | Instant response |
| Warm Request | 1-3 seconds | Browser already running |
| Batch Processing | 2-5s per URL | Concurrent processing |

### Best Practices

1. **Use Batch Processing**: Process multiple URLs with `/scrape-batch` for better throughput
2. **Enable Caching**: Results are cached for 1 hour by default
3. **Monitor Performance**: Use `/performance-test` to benchmark your setup
4. **Handle Errors**: Implement retry logic for failed requests
5. **Rate Limiting**: Add delays between requests if processing large volumes

### Optimization Tips

```bash
# Increase concurrent pages for faster processing
export MAX_CONCURRENT_PAGES=25

# Reduce timeouts for faster failures  
export PAGE_TIMEOUT=10000

# Increase batch sizes for better throughput
export BATCH_SIZE=30
```

## 📊 Integration Examples

### Python Integration

```python
import requests
import asyncio

class FacebookScraperClient:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
    
    def scrape_single(self, url):
        """Scrape a single URL"""
        response = requests.post(
            f"{self.base_url}/scrape",
            json={"url": url}
        )
        return response.json()
    
    def scrape_batch(self, urls):
        """Scrape multiple URLs"""
        response = requests.post(
            f"{self.base_url}/scrape-batch", 
            json={"urls": urls}
        )
        return response.json()
    
    def get_health(self):
        """Check API health"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()

# Usage
client = FacebookScraperClient()

# Single URL
result = client.scrape_single("https://www.facebook.com/skinplusfindon/")
print(result['email'])

# Multiple URLs
batch_results = client.scrape_batch([
    "https://www.facebook.com/skinplusfindon/",
    "https://www.facebook.com/coca-cola/"
])
print(f"Found {batch_results['successful_scrapes']} emails")
```

### JavaScript/Node.js Integration

```javascript
const axios = require('axios');

class FacebookScraperClient {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
    }
    
    async scrapeSingle(url) {
        const response = await axios.post(`${this.baseUrl}/scrape`, {
            url: url
        });
        return response.data;
    }
    
    async scrapeBatch(urls) {
        const response = await axios.post(`${this.baseUrl}/scrape-batch`, {
            urls: urls
        });
        return response.data;
    }
    
    async getHealth() {
        const response = await axios.get(`${this.baseUrl}/health`);
        return response.data;
    }
}

// Usage
const client = new FacebookScraperClient();

async function example() {
    // Single URL
    const result = await client.scrapeSingle('https://www.facebook.com/skinplusfindon/');
    console.log(result.email);
    
    // Multiple URLs  
    const batchResults = await client.scrapeBatch([
        'https://www.facebook.com/skinplusfindon/',
        'https://www.facebook.com/coca-cola/'
    ]);
    console.log(`Found ${batchResults.successful_scrapes} emails`);
}

example().catch(console.error);
```

### PHP Integration

```php
<?php

class FacebookScraperClient {
    private $baseUrl;
    
    public function __construct($baseUrl = 'http://localhost:8080') {
        $this->baseUrl = $baseUrl;
    }
    
    public function scrapeSingle($url) {
        $data = json_encode(['url' => $url]);
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . '/scrape',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json']
        ]);
        
        $response = curl_exec($curl);
        curl_close($curl);
        
        return json_decode($response, true);
    }
    
    public function scrapeBatch($urls) {
        $data = json_encode(['urls' => $urls]);
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . '/scrape-batch',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json']
        ]);
        
        $response = curl_exec($curl);
        curl_close($curl);
        
        return json_decode($response, true);
    }
}

// Usage
$client = new FacebookScraperClient();

// Single URL
$result = $client->scrapeSingle('https://www.facebook.com/skinplusfindon/');
echo $result['email'] . "\\n";

// Multiple URLs
$batchResults = $client->scrapeBatch([
    'https://www.facebook.com/skinplusfindon/',
    'https://www.facebook.com/coca-cola/'
]);
echo "Found " . $batchResults['successful_scrapes'] . " emails\\n";
?>
```

## 🔧 Configuration

### Environment Variables

Set these environment variables to customize API behavior:

```bash
# Server settings
export API_HOST=0.0.0.0
export API_PORT=8080

# Performance settings
export MAX_CONCURRENT_PAGES=15
export BATCH_SIZE=15
export PAGE_TIMEOUT=15000

# Cache settings
export CACHE_EXPIRY=3600
export ENABLE_CACHING=true

# Batch limits
export MAX_BATCH_SIZE=50
```

### Rate Limiting

The API includes built-in rate limiting:

- Batch cooldown: 2 seconds between batches
- Page timeout: 15 seconds per page
- Concurrent limit: 15 simultaneous pages

For production use, implement additional rate limiting at the load balancer level.

## 📈 Monitoring & Analytics

### Built-in Metrics

The API automatically tracks:

- Request counts and success rates
- Processing times per endpoint
- Cache hit/miss ratios
- Error rates and types
- Concurrent request levels

### Custom Monitoring

Implement custom monitoring by:

1. **Logging API responses**: Track success/failure patterns
2. **Monitoring response times**: Alert on performance degradation
3. **Cache statistics**: Monitor cache efficiency via `/cache-stats`
4. **Health checks**: Regular `/health` endpoint monitoring
5. **Error tracking**: Log and analyze error patterns

### Example Monitoring Script

```python
import requests
import time
import json

def monitor_api(base_url="http://localhost:8080"):
    """Simple API monitoring script"""
    
    while True:
        try:
            # Health check
            health = requests.get(f"{base_url}/health")
            print(f"Health: {health.status_code}")
            
            # Cache stats
            cache = requests.get(f"{base_url}/cache-stats")
            stats = cache.json()
            print(f"Cache: {stats['active_entries']} active, {stats['expired_entries']} expired")
            
            # Test single request
            start = time.time()
            test = requests.post(f"{base_url}/scrape", 
                               json={"url": "https://www.facebook.com/skinplusfindon/"})
            duration = time.time() - start
            print(f"Test request: {test.status_code} in {duration:.2f}s")
            
        except Exception as e:
            print(f"Monitoring error: {e}")
        
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    monitor_api()
```

## 🚀 Advanced Usage

### Webhook Integration

Set up webhooks to process URLs automatically:

```python
from flask import Flask, request, jsonify
import requests

webhook_app = Flask(__name__)

@webhook_app.route('/process-url', methods=['POST'])
def process_webhook():
    data = request.json
    facebook_url = data.get('url')
    
    # Send to scraper API
    response = requests.post('http://localhost:8080/scrape', 
                           json={'url': facebook_url})
    
    result = response.json()
    
    # Process result (save to database, send notification, etc.)
    if result.get('email'):
        # Handle successful extraction
        save_email_to_database(result['email'], facebook_url)
    
    return jsonify({'status': 'processed'})
```

### Batch File Processing

Process large CSV files of URLs:

```python
import csv
import requests
import time

def process_csv_file(filename, batch_size=20):
    """Process CSV file of URLs in batches"""
    
    with open(filename, 'r') as file:
        reader = csv.DictReader(file)
        urls = [row['facebook_url'] for row in reader]
    
    # Process in batches
    for i in range(0, len(urls), batch_size):
        batch = urls[i:i+batch_size]
        
        response = requests.post('http://localhost:8080/scrape-batch',
                               json={'urls': batch})
        
        results = response.json()
        
        # Save results
        for result in results['results']:
            print(f"{result['url']}: {result.get('email', 'No email')}")
        
        # Rate limiting
        time.sleep(2)

# Usage
process_csv_file('facebook_urls.csv')
```

## 📋 API Reference Summary

| Endpoint | Method | Purpose | Max URLs | Cache |
|----------|--------|---------|----------|-------|
| `/scrape` | POST | Single URL scraping | 1 | ✅ |
| `/scrape-batch` | POST | Batch URL scraping | 50 | ✅ |
| `/cache-stats` | GET | Cache statistics | - | - |
| `/clear-cache` | POST | Clear result cache | - | - |
| `/health` | GET | Health check | - | - |
| `/performance-test` | POST | Performance testing | Configurable | - |

---

**Ready to integrate the Facebook Scraper API into your applications!** 🚀

For additional support or feature requests, please refer to the main documentation or create an issue.