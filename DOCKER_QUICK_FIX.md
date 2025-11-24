# Docker Setup Guide

## Quick Fix for docker-compose

The project structure was reorganized. Here's how to use Docker now:

### Option 1: From Project Root (Recommended)

```bash
cd /home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp

# Build and run
docker-compose up --build

# Or in detached mode
docker-compose up -d --build
```

### Option 2: From docker/ Directory

```bash
cd /home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp/docker

# Build and run
docker-compose up --build
```

## Common Issues & Solutions

### Issue 1: "Can't find docker-compose.yml"

**Problem**: Running from wrong directory

**Solution**: 
```bash
# Always run from project root
cd /home/devyanshu/.gemini/antigravity/scratch/react_scraper_mvp
docker-compose up
```

### Issue 2: Network Timeout "dial tcp: lookup mcr.microsoft.com"

**Problem**: Temporary DNS/network issue

**Solutions**:
1. **Wait and retry** - Usually temporary
2. **Check internet** - `ping mcr.microsoft.com`
3. **Restart Docker**:
   ```bash
   sudo systemctl restart docker
   ```
4. **Use Google DNS**:
   ```bash
   # Edit /etc/docker/daemon.json
   {
     "dns": ["8.8.8.8", "8.8.4.4"]
   }
   # Then restart Docker
   sudo systemctl restart docker
   ```

### Issue 3: Image Pull is Slow

**Problem**: Large Playwright image (744 MB)

**Solution**: 
- First build takes ~10-15 minutes
- Subsequent builds are cached and fast
- Just be patient!

## File Locations After Reorganization

```
├── docker-compose.yml          # Root-level (convenience)
├── docker/
│   ├── Dockerfile              # Actual Dockerfile
│   └── docker-compose.yml      # Alternative location
```

Both docker-compose.yml files work the same way!

## Verification

```bash
# Check configuration is valid
docker-compose config

# Check Docker service
sudo systemctl status docker

# Check connectivity
ping mcr.microsoft.com
```

## Current Status

✅ Network connectivity: Working
✅ docker-compose.yml: Created in root
✅ Configuration: Valid

## Usage

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up --build
```
