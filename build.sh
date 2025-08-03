#!/bin/bash

echo "🚀 Building React frontend and Flask backend for Railway..."

# Build React app
echo "📦 Building React frontend..."
cd frontend
npm install
npm run build

# Move built files to backend static directory
echo "📁 Moving built files to Flask static directory..."
cd ..
rm -rf backend/static/react
mkdir -p backend/static/react
cp -r frontend/dist/* backend/static/react/

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn==21.2.0

echo "✅ Build complete! Ready for Railway deployment."
