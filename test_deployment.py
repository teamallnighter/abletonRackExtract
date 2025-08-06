#!/usr/bin/env python3
"""
Simple deployment test script
"""

import sys
import os
import subprocess

def test_requirements():
    """Test if all requirements can be installed"""
    print("🧪 Testing requirements installation...")
    
    try:
        result = subprocess.run([
            sys.executable, '-m', 'pip', 'install', '--dry-run', 
            '-r', 'backend/requirements.txt'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Requirements check passed")
            return True
        else:
            print(f"❌ Requirements check failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Requirements test error: {e}")
        return False

def test_python_syntax():
    """Test Python syntax of key files"""
    print("🧪 Testing Python syntax...")
    
    files_to_check = [
        'backend/app.py',
        'backend/server.py',
        'backend/health_check.py',
        'backend/db.py',
        'backend/abletonRackAnalyzer.py'
    ]
    
    for file_path in files_to_check:
        try:
            result = subprocess.run([
                sys.executable, '-m', 'py_compile', file_path
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ {file_path} syntax OK")
            else:
                print(f"❌ {file_path} syntax error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error checking {file_path}: {e}")
            return False
    
    return True

def main():
    print("🚀 Running deployment tests...")
    
    if not os.path.exists('backend/requirements.txt'):
        print("❌ backend/requirements.txt not found")
        return 1
    
    if not test_python_syntax():
        print("❌ Python syntax tests failed")
        return 1
    
    if not test_requirements():
        print("❌ Requirements tests failed") 
        return 1
    
    print("✅ All deployment tests passed!")
    return 0

if __name__ == '__main__':
    sys.exit(main())