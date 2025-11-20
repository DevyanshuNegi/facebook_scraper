"""
Data models for Facebook scraper
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class ScrapingResult:
    """Result of a single Facebook page scraping operation"""
    email: Optional[str]
    url: str
    processing_time: float
    error: Optional[str] = None

@dataclass
class BulkProcessingResult:
    """Result of bulk processing operation with additional metadata"""
    url: str
    email: str | None
    success: bool
    processing_time: float
    error: str | None
    timestamp: str
    attempt: int

@dataclass
class PerformanceMetrics:
    """Performance metrics for bulk processing operations"""
    total_urls: int
    successful_scrapes: int
    failed_scrapes: int
    total_processing_time: float
    average_time_per_url: float
    fastest_scrape: float
    slowest_scrape: float
    success_rate: float
    start_time: str
    end_time: str
    emails_found: list[str]
    unique_emails: int
    cache_efficiency: float