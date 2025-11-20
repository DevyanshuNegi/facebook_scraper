"""
Facebook Scraper Package
High-performance async Facebook email scraper with connection pooling and batch processing
"""

__version__ = "2.0.0"
__author__ = "Facebook Scraper Team"
__description__ = "Optimized Facebook email scraper for massive scale operations"

from .core import OptimizedFacebookScraper
from .models import ScrapingResult

__all__ = ["OptimizedFacebookScraper", "ScrapingResult"]