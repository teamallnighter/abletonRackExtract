#!/usr/bin/env python3
"""
Test FlowiseAI sync directly
"""

import os
import sys
from pathlib import Path

# Add paths
sys.path.append(str(Path(__file__).parent / 'backend'))
sys.path.append(str(Path(__file__).parent / 'ai_workflows' / 'scripts'))

from flowise_integration import FlowiseAIClient, MongoDBFlowiseAdapter
from db import MongoDB

def test_sync():
    print("Testing FlowiseAI sync...")
    
    # Initialize MongoDB
    print("\n1. Connecting to MongoDB...")
    mongodb = MongoDB()
    if not mongodb.connect():
        print("Failed to connect to MongoDB")
        return
    
    # Get all racks
    print("\n2. Getting racks from MongoDB...")
    racks = mongodb.get_recent_racks(100)
    print(f"Found {len(racks)} racks in MongoDB")
    for i, rack in enumerate(racks[:5]):
        print(f"  - {rack.get('rack_name', 'Unknown')} (ID: {rack.get('_id')})")
    
    # Initialize FlowiseAI client
    print("\n3. Initializing FlowiseAI client...")
    flowise_url = os.getenv('FLOWISE_API_URL')
    flowise_api_key = os.getenv('FLOWISE_API_KEY')
    print(f"FlowiseAI URL: {flowise_url}")
    print(f"FlowiseAI API Key: {'Set' if flowise_api_key else 'Not set'}")
    
    client = FlowiseAIClient()
    adapter = MongoDBFlowiseAdapter(client, mongodb)
    
    # Try to sync
    print("\n4. Attempting to sync racks to FlowiseAI...")
    try:
        results = adapter.sync_racks_to_flowise(5)  # Just sync 5 for testing
        print(f"Successfully synced {len(results)} racks")
    except Exception as e:
        print(f"Error during sync: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sync()
