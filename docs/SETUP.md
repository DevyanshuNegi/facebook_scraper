# Facebook Scraper Setup Guide

Complete installation and configuration guide for the Facebook Email Scraper.

## 🛠️ System Requirements

- **Python**: 3.8 or higher
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 2GB RAM (4GB+ recommended for large batches)
- **Storage**: 1GB+ free space
- **Network**: Stable internet connection

## 📦 Installation Steps

### Step 1: Download the Project

```bash
# Option 1: Git clone (if using git)
git clone <repository-url>
cd facebook_scrapper

# Option 2: Download and extract ZIP file
# Extract to desired location and navigate to folder
```

### Step 2: Create Virtual Environment

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```cmd
python -m venv venv
venv\\Scripts\\activate
```

### Step 3: Install Python Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# Verify installation
pip list | grep -E "(flask|playwright)"
```

### Step 4: Install Browser Dependencies

```bash
# Install Playwright browser (required for scraping)
playwright install chromium

# Verify browser installation
playwright install --help
```

## 🔑 Facebook Authentication Setup

### Step 1: Export Facebook Cookies

1. **Login to Facebook** in your browser
2. **Open Developer Tools** (F12)
3. **Go to Application/Storage tab**
4. **Find Cookies section** → facebook.com
5. **Export cookies** using browser extension or manual copy

### Step 2: Cookie Export Options

**Option A: Using Browser Extension (Recommended)**
1. Install "Cookie Editor" or "EditThisCookie" extension
2. Visit facebook.com while logged in
3. Click extension → Export → JSON format
4. Save as `config/fb_cookies.json`

**Option B: Manual Export**
1. Copy each cookie from DevTools
2. Format as JSON array:
```json
[
  {
    "name": "c_user",
    "value": "your_user_id",
    "domain": ".facebook.com",
    "path": "/",
    "secure": true,
    "httpOnly": false,
    "sameSite": "None"
  },
  // ... more cookies
]
```

### Step 3: Cookie File Placement

```bash
# Create config directory if it doesn't exist
mkdir -p config

# Place your exported cookies
cp /path/to/exported/cookies.json config/fb_cookies.json

# Verify file exists
ls -la config/fb_cookies.json
```

## 📊 Sample Data Setup

### Step 1: Prepare URL Data

Create `data/sample/sampledata.json` with Facebook URLs:

```json
[
  "https://www.facebook.com/skinplusfindon/",
  "https://www.facebook.com/coca-cola/",
  "https://www.facebook.com/nike/"
]
```

### Step 2: Data Format Requirements

- **Format**: JSON array of strings
- **URL Types**: Facebook page URLs only
- **Maximum**: No strict limit (recommended <10,000 per batch)
- **Validation**: URLs must contain "facebook.com"

## ⚙️ Configuration Options

### Environment Variables

Set these before running for custom configuration:

```bash
# Performance settings
export MAX_CONCURRENT_PAGES=20
export BATCH_SIZE=25
export PAGE_TIMEOUT=20000

# Cache settings  
export CACHE_EXPIRY=7200
export ENABLE_CACHING=true

# API settings
export API_HOST=0.0.0.0
export API_PORT=8080
export MAX_BATCH_SIZE=100
```

### Configuration File

Edit `src/scraper/config.py` for permanent changes:

```python
@dataclass
class ScraperConfig:
    max_concurrent_pages: int = 15  # Concurrent browser pages
    batch_size: int = 15           # URLs per batch
    page_timeout: int = 15000      # Page load timeout (ms)
    cache_expiry: int = 3600       # Cache duration (seconds)
    batch_cooldown: float = 2.0    # Delay between batches
```

## 🚀 Verification & Testing

### Step 1: Test Installation

```bash
# Test basic Python imports
python -c "import playwright; print('Playwright installed')"
python -c "import flask; print('Flask installed')"

# Test project imports
python -c "import sys; sys.path.append('src'); from scraper.config import default_config; print('Project imports working')"
```

### Step 2: Test Single URL

```bash
# Run a quick test
python -c "
import asyncio
import sys
sys.path.append('src')
from scraper.core import get_email_from_page_optimized

async def test():
    email = await get_email_from_page_optimized('https://www.facebook.com/skinplusfindon/')
    print(f'Test email: {email}')

asyncio.run(test())
"
```

### Step 3: Test API Server

```bash
# Start the server (in one terminal)
python run_server.py

# Test health endpoint (in another terminal)
curl http://localhost:8080/health

# Expected response:
# {"status": "healthy", "timestamp": 1700000000.0, "version": "2.0.0"}
```

### Step 4: Test Bulk Processing

```bash
# Run bulk processing on sample data
python run_bulk.py

# Check for generated results
ls -la data/results/
```

## 🔧 Performance Optimization

### Memory Optimization

```bash
# For systems with limited memory
export MAX_CONCURRENT_PAGES=5
export BATCH_SIZE=10
```

### Speed Optimization

```bash
# For faster processing
export MAX_CONCURRENT_PAGES=25
export BATCH_SIZE=30
export PAGE_TIMEOUT=10000
```

### Stability Optimization

```bash
# For reliable long-running operations
export BATCH_COOLDOWN=5.0
export PAGE_TIMEOUT=30000
export BATCH_SIZE=10
```

## 🐛 Troubleshooting

### Common Installation Issues

**Issue**: `ModuleNotFoundError: No module named 'playwright'`
```bash
# Solution: Reinstall with correct Python path
./venv/bin/pip install playwright
./venv/bin/playwright install chromium
```

**Issue**: `Permission denied: fb_cookies.json`
```bash
# Solution: Fix file permissions
chmod 644 config/fb_cookies.json
```

**Issue**: `Browser download failed`
```bash
# Solution: Manual browser install
./venv/bin/playwright install --force chromium
```

### Runtime Issues

**Issue**: `Cookie authentication failed`
- Solution: Re-export fresh Facebook cookies
- Ensure you're logged into Facebook when exporting
- Check cookie format matches expected JSON structure

**Issue**: `Timeout errors`
- Solution: Increase page timeout
- Check internet connection stability
- Reduce concurrent pages if system is overloaded

**Issue**: `High memory usage`
- Solution: Reduce max_concurrent_pages
- Process smaller batches
- Add delays between operations

## 🔒 Security Considerations

### Cookie Security
- Store cookies securely (never commit to version control)
- Rotate cookies regularly (every 30 days)
- Use environment-specific cookie files
- Limit cookie file permissions (chmod 600)

### Rate Limiting
- Start with small batches (5-10 URLs)
- Monitor Facebook response times
- Increase delays if getting blocked
- Respect Facebook's Terms of Service

## 📈 Monitoring Setup

### Basic Monitoring

```bash
# Monitor memory usage
top -p $(pgrep -f "python.*run_")

# Monitor network activity  
netstat -i

# Monitor disk space
df -h data/results/
```

### Advanced Monitoring

```bash
# Log all operations
python run_bulk.py 2>&1 | tee logs/processing.log

# Monitor performance metrics
tail -f data/results/performance_report_*.md
```

## 🚀 Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/facebook-scraper.service`:

```ini
[Unit]
Description=Facebook Scraper API
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/facebook_scrapper
Environment=PATH=/path/to/facebook_scrapper/venv/bin
ExecStart=/path/to/facebook_scrapper/venv/bin/python run_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable facebook-scraper
sudo systemctl start facebook-scraper
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chromium

COPY . .
EXPOSE 8080

CMD ["python", "run_server.py"]
```

Build and run:
```bash
docker build -t facebook-scraper .
docker run -p 8080:8080 facebook-scraper
```

## 📊 Performance Benchmarks

### Expected Performance (Single Instance)

| Metric | Value |
|--------|-------|
| Cold Start | ~5 seconds |
| Warm Requests | ~1.8 seconds |
| Batch Processing | ~2.5s per URL |
| Hourly Capacity | ~1,500 URLs |
| Daily Capacity | ~37,000 URLs |
| Success Rate | ~75% |

### Scaling Recommendations

| Scale | Setup | Expected Throughput |
|-------|-------|-------------------|
| Small (1K URLs) | Single instance | 1 hour |
| Medium (10K URLs) | Single instance | 8 hours |
| Large (100K URLs) | 3-5 instances | 24 hours |
| Enterprise (1M+ URLs) | 10+ instances + Redis | 7 days |

## ✅ Setup Checklist

- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Playwright browser installed (`playwright install chromium`)
- [ ] Facebook cookies exported to `config/fb_cookies.json`
- [ ] Sample data created in `data/sample/sampledata.json`
- [ ] Test single URL scraping works
- [ ] API server starts without errors (`python run_server.py`)
- [ ] Health endpoint responds (`curl localhost:8080/health`)
- [ ] Bulk processing works (`python run_bulk.py`)
- [ ] Results saved to `data/results/`
- [ ] Performance meets requirements

## 🎓 Next Steps

1. **Read the API Documentation**: `docs/API.md`
2. **Run Performance Tests**: `python run_bulk.py`
3. **Customize Configuration**: Edit `src/scraper/config.py`
4. **Set Up Monitoring**: Implement logging and metrics
5. **Scale as Needed**: Add multiple instances for larger volumes

---

**Setup complete! Your Facebook scraper is ready for massive scale operations.** 🚀

For issues or questions, check the troubleshooting section or create a support ticket.