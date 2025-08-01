#!/usr/bin/env python3
"""
Sync racks from MongoDB to FlowiseAI
This script connects your existing MongoDB database to FlowiseAI
"""

import os
import sys
from pathlib import Path

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Railway provides environment variables directly
    pass

# Add parent directory to import modules
sys.path.append(str(Path(__file__).parent.parent.parent / 'backend'))
sys.path.append(str(Path(__file__).parent))

from flowise_integration import FlowiseAIClient, MongoDBFlowiseAdapter
from db import MongoDB


def main():
    """Main sync function"""
    print("=== MongoDB to FlowiseAI Sync ===\n")
    
    # Initialize MongoDB connection
    print("1. Connecting to MongoDB...")
    mongodb = MongoDB()
    if not mongodb.connect():
        print("Failed to connect to MongoDB. Check your MONGO_URL environment variable.")
        return
    
    # Get some stats
    recent_racks = mongodb.get_recent_racks(5)
    print(f"   Connected! Found {len(recent_racks)} recent racks in database.")
    
    # Initialize FlowiseAI client
    print("\n2. Connecting to FlowiseAI...")
    flowise_url = os.getenv('FLOWISE_API_URL')
    if not flowise_url:
        print("   WARNING: FLOWISE_API_URL not set. Using default: http://localhost:3000")
        print("   To connect to your Railway FlowiseAI instance, set:")
        print("   export FLOWISE_API_URL=https://your-flowise-instance.railway.app")
    
    client = FlowiseAIClient()
    print(f"   FlowiseAI URL: {client.base_url}")
    
    # Initialize adapter
    adapter = MongoDBFlowiseAdapter(client, mongodb)
    
    # Ask user what to do
    print("\n3. What would you like to do?")
    print("   a) Create a new chatflow for rack analysis")
    print("   b) Sync racks from MongoDB to FlowiseAI")
    print("   c) Search and analyze racks")
    print("   d) All of the above")
    
    choice = input("\nEnter your choice (a/b/c/d): ").lower()
    
    chatflow_id = None
    
    if choice in ['a', 'd']:
        print("\n4. Creating rack analysis chatflow...")
        try:
            chatflow = adapter.create_rack_analysis_chatflow()
            chatflow_id = chatflow['id']
            print(f"   ✓ Created chatflow: {chatflow_id}")
        except Exception as e:
            print(f"   ✗ Error creating chatflow: {e}")
            if "Connection refused" in str(e):
                print("\n   Make sure FlowiseAI is running and accessible.")
                print("   If running on Railway, check that FLOWISE_API_URL is set correctly.")
            return
    
    if choice in ['b', 'd']:
        print("\n5. Syncing racks to FlowiseAI...")
        limit = input("   How many racks to sync? (press Enter for all): ")
        limit = int(limit) if limit else None
        
        try:
            results = adapter.sync_racks_to_flowise(limit)
            print(f"   ✓ Successfully synced {len(results)} racks!")
        except Exception as e:
            print(f"   ✗ Error syncing racks: {e}")
    
    if choice in ['c', 'd']:
        if not chatflow_id:
            chatflow_id = input("\n6. Enter chatflow ID to use for analysis: ")
        
        print("\n7. Search and analyze racks")
        while True:
            query = input("   Enter search query (or 'quit' to exit): ")
            if query.lower() == 'quit':
                break
            
            try:
                result = adapter.search_and_analyze(query, chatflow_id)
                print(f"\n   Found {len(result['results'])} racks")
                print(f"\n   AI Analysis:\n   {result['analysis']}\n")
            except Exception as e:
                print(f"   ✗ Error: {e}")
    
    print("\n✓ Done!")


if __name__ == "__main__":
    main()
