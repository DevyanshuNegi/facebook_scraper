# Optimized Dockerfile for AWS Free Tier (t2.micro - 1GB RAM)
FROM python:3.11-slim

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    procps \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Install only Chromium browser (lighter footprint)
RUN playwright install --with-deps chromium

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data/results data/sample config logs

# Set environment variables optimized for free tier
ENV PYTHONPATH=/app/src
ENV MAX_CONCURRENT_PAGES=3
ENV BATCH_SIZE=5
ENV PAGE_TIMEOUT=20000
ENV BATCH_COOLDOWN=3.0
ENV CACHE_EXPIRY=1800
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
ENV ENABLE_CACHING=true

# Expose port
EXPOSE 8080

# Health check with longer intervals for free tier
HEALTHCHECK --interval=60s --timeout=30s --start-period=15s --retries=2 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use gunicorn for better resource management
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "2", "--timeout", "120", "wsgi:app"]