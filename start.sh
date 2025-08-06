#!/bin/bash

# Railway deployment script (backup method)
echo "🚀 Starting Railway deployment via shell script..."

# Ensure we're in the right directory
echo "📍 Current directory: $(pwd)"

# Check Python version and determine which python to use
echo "🐍 Checking available Python interpreters:"
for python_cmd in "/opt/venv/bin/python" "python3" "python" "/usr/local/bin/python3" "/usr/bin/python3"; do
    if command -v "$python_cmd" >/dev/null 2>&1; then
        PYTHON_CMD="$python_cmd"
        echo "✅ Found: $python_cmd"
        $PYTHON_CMD --version
        break
    else
        echo "❌ Not found: $python_cmd"
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ No Python interpreter found!"
    exit 1
fi

# Change to backend directory
cd backend || { echo "❌ Failed to change to backend directory"; exit 1; }

echo "📁 Backend directory contents:"
ls -la

# Run health check
echo "🔍 Running health check:"
$PYTHON_CMD health_check.py

if [ $? -ne 0 ]; then
    echo "❌ Health check failed!"
    exit 1
fi

echo "🎯 Starting production server..."
exec $PYTHON_CMD server.py
