#!/bin/bash

# 🚀 Manual Deploy Script
# Use this for quick manual deployments outside of GitHub Actions

set -e  # Exit on any error

echo "🏗️  Starting manual deployment..."

# Check if we're in the right directory
if [ ! -d "frontend-new" ]; then
    echo "❌ Error: frontend-new directory not found. Run this from project root."
    exit 1
fi

if [ ! -d "backend/static" ]; then
    echo "❌ Error: backend/static directory not found. Run this from project root."
    exit 1
fi

# Build frontend
echo "📦 Installing dependencies..."
cd frontend-new
npm ci

echo "🏗️  Building React app..."
npm run build

echo "📋 Copying build to backend..."
cd ..
rm -rf backend/static/frontend/*
cp -r frontend-new/dist/* backend/static/frontend/

# Commit and push
echo "💾 Committing changes..."
git add backend/static/frontend/
git commit -m "🚀 Manual deploy: $(date)"

echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Manual deployment completed!"
echo "🌐 Railway will automatically deploy in ~2-3 minutes"
