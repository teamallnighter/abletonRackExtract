#!/bin/bash

# Test script for AI endpoints on Railway

BASE_URL="https://web-production-70a35.up.railway.app"

echo "Testing AI endpoints on Railway..."
echo "================================="

# Test 1: Check AI Status
echo -e "\n1. Testing AI Status endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/ai/status" | python -m json.tool || echo "Failed to parse JSON"

# Test 2: Check regular health endpoint
echo -e "\n2. Testing Health endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/health" | python -m json.tool || echo "Failed to parse JSON"

# Test 3: Try to get recent racks (no auth required)
echo -e "\n3. Testing Recent Racks endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/racks?limit=5" | python -m json.tool || echo "Failed to parse JSON"

echo -e "\nTest complete!"
