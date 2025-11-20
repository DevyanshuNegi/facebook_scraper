#!/usr/bin/env python3
"""
Main entry point for Facebook Scraper API server
"""
import sys
import os
from pathlib import Path

# Add the src directory to the Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

from api.server import FacebookScraperAPI
from scraper.config import default_config


def main():
    """Main function to run the API server"""
    print("🚀 Facebook Scraper API Server")
    print("=" * 40)
    print(f"Host: {default_config.api_host}")
    print(f"Port: {default_config.api_port}")
    print(f"Max concurrent pages: {default_config.max_concurrent_pages}")
    print(f"Caching: {'Enabled' if default_config.enable_caching else 'Disabled'}")
    print("=" * 40)
    
    try:
        api = FacebookScraperAPI()
        api.run()
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()