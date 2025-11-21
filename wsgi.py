#!/usr/bin/env python3
"""
WSGI entry point for production deployment with gunicorn
"""
import sys
import os
from pathlib import Path

# Add the src directory to the Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

# Import the Flask app
from api.server import create_app

# Create the application
app = create_app()

if __name__ == "__main__":
    # For direct execution (development)
    app.run(host='0.0.0.0', port=8080, debug=False)