#!/usr/bin/env python3
"""
Simple health check script to verify app can start
"""

import sys
import os

def check_environment():
    """Check environment variables and paths"""
    print(f"🐍 Python version: {sys.version}")
    print(f"📍 Working directory: {os.getcwd()}")
    print(f"🌐 PORT: {os.environ.get('PORT', 'not set')}")
    print(f"📊 MONGODB_URI: {'set' if os.environ.get('MONGODB_URI') else 'not set'}")
    return True

def check_imports():
    """Check if all required modules can be imported"""
    try:
        import flask
        print(f"✅ Flask imported successfully (v{flask.__version__})")
        
        import pymongo
        print(f"✅ PyMongo imported successfully (v{pymongo.__version__})")
        
        import gunicorn
        print(f"✅ Gunicorn imported successfully (v{gunicorn.__version__})")
        
        from abletonRackAnalyzer import decompress_and_parse_ableton_file
        print("✅ AbletonRackAnalyzer imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def check_app():
    """Check if Flask app can be created"""
    try:
        from app import app
        print("✅ Flask app created successfully")
        
        # Test basic Flask app configuration
        print(f"📊 App config check:")
        print(f"  - Debug: {app.debug}")
        print(f"  - Testing: {app.testing}")
        print(f"  - Secret key set: {'Yes' if app.config.get('SECRET_KEY') else 'No'}")
        
        return True
    except Exception as e:
        print(f"❌ App creation error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🔍 Running health check...")
    
    check_environment()
    
    if not check_imports():
        sys.exit(1)
    
    if not check_app():
        sys.exit(1)
    
    print("✅ All checks passed!")