#!/usr/bin/env python3
"""
Quick test to verify the organized project structure works
"""
import sys
from pathlib import Path

# Add the src directory to Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

def test_imports():
    """Test that all imports work correctly"""
    try:
        print("🧪 Testing project structure...")
        
        # Test scraper imports
        from scraper.config import default_config, ScraperConfig
        print("✅ Scraper config import: OK")
        
        from scraper.models import ScrapingResult, BulkProcessingResult, PerformanceMetrics
        print("✅ Scraper models import: OK")
        
        # Test that config works
        config = ScraperConfig()
        print(f"✅ Default config created: {config.max_concurrent_pages} concurrent pages")
        
        # Test path resolution
        cookie_path = default_config.get_absolute_path("config/fb_cookies.json")
        print(f"✅ Path resolution: {Path(cookie_path).name}")
        
        print("\n🎉 All imports successful! Project structure is properly organized.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_file_structure():
    """Test that all expected files and directories exist"""
    print("\n📁 Testing file structure...")
    
    expected_paths = [
        "src/scraper/__init__.py",
        "src/scraper/core.py", 
        "src/scraper/models.py",
        "src/scraper/config.py",
        "src/api/__init__.py",
        "src/api/server.py",
        "config/fb_cookies.json",
        "data/sample/sampledata.json",
        "docs/SETUP.md",
        "docs/API.md",
        "README.md",
        "requirements.txt",
        "run_server.py",
        "run_bulk.py"
    ]
    
    missing_files = []
    for path in expected_paths:
        full_path = project_root / path
        if full_path.exists():
            print(f"✅ {path}")
        else:
            print(f"❌ {path} - MISSING")
            missing_files.append(path)
    
    if missing_files:
        print(f"\n⚠️  {len(missing_files)} files are missing")
        return False
    else:
        print(f"\n✅ All {len(expected_paths)} files found!")
        return True

def show_project_overview():
    """Show the organized project structure"""
    print("\n" + "="*60)
    print("📊 ORGANIZED PROJECT STRUCTURE")
    print("="*60)
    
    structure = """
facebook_scrapper/
├── 📁 src/                          # Source code
│   ├── 📁 scraper/                  # Core scraper package  
│   │   ├── __init__.py              # Package initialization
│   │   ├── core.py                  # Main scraper implementation
│   │   ├── models.py                # Data models & types
│   │   └── config.py                # Configuration management
│   └── 📁 api/                      # REST API package
│       ├── __init__.py              # Package initialization  
│       └── server.py                # Flask API server
├── 📁 scripts/                      # Utility scripts
│   ├── __init__.py                  # Package initialization
│   └── bulk_processor.py            # Bulk processing script
├── 📁 config/                       # Configuration files
│   └── fb_cookies.json              # Facebook authentication cookies
├── 📁 data/                         # Data directory
│   ├── 📁 sample/                   # Sample data
│   │   └── sampledata.json          # Sample Facebook URLs
│   └── 📁 results/                  # Processing results & reports
├── 📁 docs/                         # Documentation
│   ├── SETUP.md                     # Detailed setup guide
│   └── API.md                       # Complete API reference
├── 🐍 run_server.py                 # API server entry point
├── 🐍 run_bulk.py                   # Bulk processing entry point  
├── 📄 README.md                     # Project overview
├── 📄 requirements.txt              # Python dependencies
└── 📁 venv/                         # Virtual environment (created during setup)
    """
    print(structure)
    
    print("🎯 KEY IMPROVEMENTS:")
    print("=" * 40)
    print("✅ Modular code organization")
    print("✅ Clear separation of concerns")  
    print("✅ Professional documentation")
    print("✅ Easy configuration management")
    print("✅ Standardized entry points")
    print("✅ Results organization")
    print("✅ Comprehensive setup guide")

def main():
    """Run all tests"""
    print("🧪 FACEBOOK SCRAPER PROJECT STRUCTURE TEST")
    print("="*60)
    
    # Test file structure
    files_ok = test_file_structure()
    
    # Test imports  
    imports_ok = test_imports()
    
    # Show overview
    show_project_overview()
    
    # Final result
    print("\n" + "="*60)
    if files_ok and imports_ok:
        print("🎉 PROJECT STRUCTURE VERIFICATION: PASSED")
        print("✅ Ready for production use!")
    else:
        print("❌ PROJECT STRUCTURE VERIFICATION: FAILED")
        print("⚠️  Please fix the issues above before proceeding")
    print("="*60)
    
    return files_ok and imports_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)