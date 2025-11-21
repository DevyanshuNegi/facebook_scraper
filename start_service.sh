#!/bin/bash

# Facebook Scraper - AWS Free Tier Startup Script
# This script starts the scraper service with free tier optimizations

echo "🚀 Starting Facebook Scraper Service (AWS Free Tier Optimized)"
echo "============================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p data/results logs config

# Set appropriate permissions
echo "🔐 Setting permissions..."
chmod +x wsgi.py
chmod +x start_service.sh

# Build and start the service
echo "🏗️ Building and starting the service..."
docker-compose up --build -d

# Wait a moment for the service to initialize
echo "⏳ Waiting for service to start..."
sleep 10

# Check health
echo "🔍 Checking service health..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Service is running successfully!"
    echo ""
    echo "📊 Service Information:"
    echo "   • API Base URL: http://localhost:8080"
    echo "   • Health Check: http://localhost:8080/health"
    echo "   • Single URL: POST http://localhost:8080/scrape"
    echo "   • Batch Processing: POST http://localhost:8080/scrape-batch"
    echo ""
    echo "📋 Quick Test:"
    echo '   curl -X POST http://localhost:8080/scrape -H "Content-Type: application/json" -d '\''{"url": "https://www.facebook.com/meta"}'\'''
    echo ""
    echo "📜 View logs:"
    echo "   docker-compose logs -f facebook-scraper"
    echo ""
    echo "🛑 Stop service:"
    echo "   docker-compose down"
else
    echo "❌ Service failed to start. Check logs:"
    echo "   docker-compose logs facebook-scraper"
fi