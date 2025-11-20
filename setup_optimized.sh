#!/bin/bash

# Quick Setup Script for Optimized Facebook Scraper

echo "🚀 Setting up Optimized Facebook Scraper..."
echo "=========================================="

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Install playwright browsers
echo "🌐 Installing Playwright browsers..."
playwright install chromium

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 KEY PERFORMANCE IMPROVEMENTS:"
echo "================================="
echo "• Browser instance reuse (eliminates 2-3s startup time)"
echo "• Connection pooling (handles 15 concurrent requests)"
echo "• Targeted CSS selectors (faster than full page text)"
echo "• In-memory caching (instant responses for repeated URLs)"
echo "• Batch processing endpoint (process multiple URLs concurrently)"
echo "• Async/await architecture (non-blocking operations)"
echo ""
echo "📈 EXPECTED PERFORMANCE:"
echo "======================="
echo "• First request: ~2-4s (cold start)"
echo "• Subsequent requests: ~0.5-1.5s (warm)"
echo "• Batch processing: ~1-2s for 5 URLs concurrently"
echo "• Cached requests: <100ms"
echo ""
echo "🚀 USAGE:"
echo "========"
echo "1. Start the optimized server:"
echo "   python optimized_main.py"
echo ""
echo "2. Test single URL:"
echo "   curl -X POST http://localhost:8080/scrape \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"url\": \"https://www.facebook.com/skinplusfindon/\"}'"
echo ""
echo "3. Test batch processing:"
echo "   curl -X POST http://localhost:8080/scrape-batch \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"urls\": [\"https://www.facebook.com/skinplusfindon/\", \"https://www.facebook.com/coca-cola/\"]}'"
echo ""
echo "4. Run performance benchmarks:"
echo "   python performance_test.py"
echo ""
echo "💡 PRO TIPS:"
echo "============"
echo "• Use /scrape-batch for multiple URLs (much faster)"
echo "• Results are cached for 1 hour (instant subsequent requests)"
echo "• Monitor performance with /cache-stats endpoint"
echo "• Clear cache with /clear-cache if needed"
echo ""
echo "🎉 Ready to scrape at massive scale!"