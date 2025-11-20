"""
API package for Facebook scraper
"""

from .server import FacebookScraperAPI, create_app

__all__ = ["FacebookScraperAPI", "create_app"]