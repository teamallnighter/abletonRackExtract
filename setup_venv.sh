#!/bin/bash

# Setup virtual environment for Railway deployment
echo "🔧 Setting up Python virtual environment..."

# Create virtual environment
python3 -m venv /opt/venv

# Activate and upgrade pip
source /opt/venv/bin/activate
/opt/venv/bin/pip install --upgrade pip setuptools wheel

# Install requirements
echo "📦 Installing Python dependencies..."
/opt/venv/bin/pip install -r backend/requirements.txt --no-cache-dir

# Verify installation
echo "✅ Verification:"
/opt/venv/bin/python --version
/opt/venv/bin/pip list | grep -E "(Flask|gunicorn|pymongo)"

echo "🎉 Virtual environment setup complete!"