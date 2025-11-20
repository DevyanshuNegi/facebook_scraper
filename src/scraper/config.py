"""
Configuration management for Facebook scraper
"""
import os
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ScraperConfig:
    """Configuration settings for the Facebook scraper"""
    
    # Browser settings
    max_concurrent_pages: int = 15
    browser_timeout: int = 60000
    headless: bool = True
    
    # Performance settings
    batch_size: int = 15
    batch_cooldown: float = 2.0
    page_timeout: int = 15000
    retry_attempts: int = 1
    
    # Cache settings
    cache_expiry: int = 3600  # 1 hour
    enable_caching: bool = True
    
    # File paths
    cookies_file: str = "config/fb_cookies.json"
    sample_data_file: str = "data/sample/sampledata.json"
    results_dir: str = "data/results"
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    max_batch_size: int = 50
    
    # Email extraction settings
    email_patterns: list[str] = None
    email_selectors: list[str] = None
    
    def __post_init__(self):
        """Initialize default patterns if not provided"""
        if self.email_patterns is None:
            self.email_patterns = [
                r'\b[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b',
                r'mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'href="mailto:([^"]+)"'
            ]
        
        if self.email_selectors is None:
            self.email_selectors = [
                '[href^="mailto:"]',
                'a[href*="@"]',
                'span:has-text("@")',
                'div:has-text("@")',
                'p:has-text("@")',
                '[data-testid*="contact"]',
                '[aria-label*="email"]',
                '[aria-label*="Email"]'
            ]
    
    @classmethod
    def from_env(cls) -> 'ScraperConfig':
        """Create configuration from environment variables"""
        return cls(
            max_concurrent_pages=int(os.getenv('MAX_CONCURRENT_PAGES', '15')),
            browser_timeout=int(os.getenv('BROWSER_TIMEOUT', '60000')),
            headless=os.getenv('HEADLESS', 'true').lower() == 'true',
            batch_size=int(os.getenv('BATCH_SIZE', '15')),
            batch_cooldown=float(os.getenv('BATCH_COOLDOWN', '2.0')),
            page_timeout=int(os.getenv('PAGE_TIMEOUT', '15000')),
            cache_expiry=int(os.getenv('CACHE_EXPIRY', '3600')),
            enable_caching=os.getenv('ENABLE_CACHING', 'true').lower() == 'true',
            api_host=os.getenv('API_HOST', '0.0.0.0'),
            api_port=int(os.getenv('API_PORT', '8080')),
            max_batch_size=int(os.getenv('MAX_BATCH_SIZE', '50'))
        )
    
    def get_absolute_path(self, relative_path: str) -> str:
        """Get absolute path for a file relative to project root"""
        project_root = Path(__file__).parent.parent.parent
        return str(project_root / relative_path)

# Default configuration instance
default_config = ScraperConfig()