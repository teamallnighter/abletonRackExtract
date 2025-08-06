#!/bin/bash

# Railway deployment script
echo "🚀 Starting Railway deployment..."

# Ensure we're in the right directory
echo "📍 Current directory: $(pwd)"
echo "📁 Listing backend files:"
ls -la backend/

# Check Python version and determine which python to use
echo "🐍 Python version:"
if [ -f "/opt/venv/bin/python" ]; then
    PYTHON_CMD="/opt/venv/bin/python"
    echo "Using virtual environment python"
    $PYTHON_CMD --version
else
    PYTHON_CMD="python3"
    echo "Using system python"
    $PYTHON_CMD --version
fi

# Change to backend directory
cd backend

# Run health check
echo "🔍 Running health check:"
$PYTHON_CMD health_check.py

if [ $? -ne 0 ]; then
    echo "❌ Health check failed!"
    exit 1
fi

echo "🎯 Starting production server..."
exec $PYTHON_CMD server.py
