#!/usr/bin/env python3
"""
Simple launcher script for Railway deployment
This script runs from the project root and launches the backend server
"""

import os
import sys
import subprocess

# Change to the backend directory
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')

print(f"📍 Changing to backend directory: {backend_dir}")
os.chdir(backend_dir)

print(f"📁 Current working directory: {os.getcwd()}")
print(f"🐍 Python executable: {sys.executable}")

# Import and run the server
try:
    # Add backend to path
    sys.path.insert(0, backend_dir)
    
    # Import and run server
    import server
    
except Exception as e:
    print(f"❌ Failed to start server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)