#!/usr/bin/env python3
"""
Test AI API integration on Railway
"""

import requests
import json
import os

# Get the base URL from environment or use deployed URL
BASE_URL = os.getenv('BASE_URL', 'https://ableton.recipes')

def test_ai_status():
    """Test AI status endpoint"""
    print("Testing AI Status...")
    response = requests.get(f"{BASE_URL}/api/ai/status")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def login(username, password):
    """Login to get JWT token"""
    print(f"\nLogging in as {username}...")
    response = requests.post(f"{BASE_URL}/api/login", json={
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        token = response.json()['token']
        print("Login successful!")
        return token
    else:
        print(f"Login failed: {response.json()}")
        return None

def create_chatflow(token):
    """Create AI chatflow"""
    print("\nCreating AI Chatflow...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/api/ai/create-chatflow", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def sync_racks(token, limit=10):
    """Sync racks to FlowiseAI"""
    print(f"\nSyncing {limit} racks to FlowiseAI...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/api/ai/sync-racks", 
                           headers=headers,
                           json={"limit": limit})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def main():
    """Main test function"""
    print(f"Testing AI API at: {BASE_URL}")
    print("=" * 50)
    
    # Test status (no auth required)
    test_ai_status()
    
    # For authenticated endpoints, you'll need to login first
    # Replace with your actual credentials
    username = input("\nEnter username (or press Enter to skip auth tests): ")
    if username:
        password = input("Enter password: ")
        token = login(username, password)
        
        if token:
            # Test authenticated endpoints
            create_chatflow(token)
            sync_racks(token, limit=5)
    
    print("\nTest complete!")

if __name__ == "__main__":
    main()
