#!/usr/bin/env python3
"""
Bulk Facebook URL processor with performance tracking
"""
import sys
import asyncio
from pathlib import Path

# Add the src directory to the Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

from scripts.bulk_processor import BulkFacebookProcessor


def main():
    """Main function to run bulk processing"""
    print("🎯 Facebook Bulk URL Processor")
    print("=" * 40)
    
    try:
        processor = BulkFacebookProcessor()
        asyncio.run(processor.process_sample_data())
    except KeyboardInterrupt:
        print("\n👋 Processing stopped by user")
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()