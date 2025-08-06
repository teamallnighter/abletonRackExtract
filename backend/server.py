#!/usr/bin/env python3
"""
Production server launcher with fallback options
"""

import os
import sys
import subprocess
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def try_gunicorn():
    """Try to start with gunicorn"""
    try:
        # First check if gunicorn is importable
        import gunicorn
        logger.info(f"✅ Gunicorn available: {gunicorn.__version__}")
        
        # Test if app can be imported
        from app import app
        logger.info("✅ Flask app imported successfully")
        
        port = os.environ.get('PORT', '5001')
        cmd = [
            'python', '-m', 'gunicorn', 
            'app:app',
            '--bind', f'0.0.0.0:{port}',
            '--workers', '1',
            '--timeout', '120',
            '--preload',
            '--log-level', 'info'
        ]
        
        logger.info(f"🎯 Starting gunicorn: {' '.join(cmd)}")
        
        # Use execvp to replace current process
        os.execvp('python', cmd)
        
    except ImportError as e:
        logger.warning(f"Gunicorn not available: {e}")
        return False
    except Exception as e:
        logger.error(f"Gunicorn setup failed: {e}")
        return False

def try_flask():
    """Fallback to Flask development server"""
    try:
        logger.info("🔄 Falling back to Flask development server")
        from app import app
        
        port = int(os.environ.get('PORT', 5001))
        logger.info(f"🌐 Starting Flask server on 0.0.0.0:{port}")
        
        # Configure Flask for production-like behavior
        app.config['ENV'] = 'production'
        app.config['DEBUG'] = False
        
        app.run(debug=False, host='0.0.0.0', port=port, threaded=True)
        
    except Exception as e:
        logger.error(f"❌ Flask server failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    logger.info("🚀 Starting production server...")
    
    # Set up environment
    logger.info(f"📍 Working directory: {os.getcwd()}")
    logger.info(f"🐍 Python path: {sys.executable}")
    logger.info(f"🌐 PORT: {os.environ.get('PORT', '5001')}")
    
    # Try gunicorn first, fall back to Flask
    if not try_gunicorn():
        try_flask()