#!/bin/bash

# Railway deployment script
echo "🚀 Starting Railway deployment..."

# Ensure we're in the right directory
echo "📍 Current directory: $(pwd)"
echo "📁 Listing backend files:"
ls -la backend/

# Check Python version
echo "🐍 Python version:"
python3 --version || python --version

# Verify gunicorn installation
echo "✅ Verifying gunicorn installation:"
cd backend
python3 -c "import gunicorn; print(f'Gunicorn version: {gunicorn.__version__}')" || python -c "import gunicorn; print(f'Gunicorn version: {gunicorn.__version__}')"

# Check if we can import the Flask app
echo "🌐 Testing Flask app import:"
python3 -c "from app import app; print('✅ Flask app imported successfully')" || python -c "from app import app; print('✅ Flask app imported successfully')"

echo "🎯 Starting gunicorn..."
exec python3 -m gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120 --preload
