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

# Change to backend directory
cd backend

# Run health check
echo "🔍 Running health check:"
python3 health_check.py

if [ $? -ne 0 ]; then
    echo "❌ Health check failed!"
    exit 1
fi

echo "🎯 Starting production server..."
exec python3 server.py
