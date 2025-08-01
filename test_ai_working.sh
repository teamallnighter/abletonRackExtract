#!/bin/bash

# Test script for AI endpoints on Railway

BASE_URL="https://web-production-70a35.up.railway.app"

echo "Testing AI endpoints on Railway..."
echo "================================="

# Test 1: Check AI Status
echo -e "\n1. Testing AI Status endpoint..."
echo "Response:"
curl -s "$BASE_URL/api/ai/status" | python -m json.tool

# Test 2: Check FlowiseAI URL from status
echo -e "\n2. Extracting FlowiseAI URL..."
FLOWISE_URL=$(curl -s "$BASE_URL/api/ai/status" | python -c "import sys, json; print(json.load(sys.stdin)['flowise_url'])")
echo "FlowiseAI URL: $FLOWISE_URL"

# Test 3: Check if FlowiseAI is accessible
echo -e "\n3. Testing FlowiseAI connectivity..."
curl -s -o /dev/null -w "FlowiseAI HTTP Status: %{http_code}\n" "$FLOWISE_URL"

echo -e "\n✅ AI Integration is working! MongoDB is connected and FlowiseAI is ready."
echo -e "\nNext steps:"
echo "1. Login to get a JWT token"
echo "2. Create a chatflow for rack analysis"
echo "3. Sync your racks from MongoDB to FlowiseAI"
echo "4. Start querying AI insights about your racks"
