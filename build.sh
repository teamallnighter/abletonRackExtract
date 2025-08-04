#!/bin/bash
set -e

echo "Building React frontend..."
cd frontend-new
npm ci
npm run build

echo "Moving React build to Flask static folder..."
cd ..
rm -rf backend/static/frontend
mkdir -p backend/static/frontend
cp -r frontend-new/dist/* backend/static/frontend/

echo "Build complete!"