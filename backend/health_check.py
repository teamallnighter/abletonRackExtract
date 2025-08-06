#!/usr/bin/env python3
"""
Simple health check script to verify app can start
"""

import sys
import os

def check_imports():
    """Check if all required modules can be imported"""
    try:
        import flask
        print("✅ Flask imported successfully")
        
        import pymongo
        print("✅ PyMongo imported successfully")
        
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
        return True
    except Exception as e:
        print(f"❌ App creation error: {e}")
        return False

if __name__ == '__main__':
    print("🔍 Running health check...")
    
    if not check_imports():
        sys.exit(1)
    
    if not check_app():
        sys.exit(1)
    
    print("✅ All checks passed!")