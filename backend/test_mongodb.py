#!/usr/bin/env python3
"""
Test MongoDB connection and basic operations
"""

import os
from db import db

def test_mongodb_connection():
    """Test MongoDB connection and operations"""
    print("Testing MongoDB connection...")
    
    # Test connection
    if db.connect():
        print("✓ Successfully connected to MongoDB")
        print(f"  Database: {db.db.name}")
        print(f"  Collection: {db.collection.name}")
    else:
        print("✗ Failed to connect to MongoDB")
        return
    
    # Test saving a dummy rack
    print("\nTesting save operation...")
    test_rack = {
        'rack_name': 'Test Rack',
        'chains': [
            {
                'name': 'Chain 1',
                'devices': [
                    {'name': 'Device 1', 'is_on': True},
                    {'name': 'Device 2', 'is_on': False}
                ]
            }
        ],
        'macro_controls': [
            {'name': 'Macro 1'},
            {'name': 'Macro 2'}
        ]
    }
    
    rack_id = db.save_rack_analysis(test_rack, 'test_rack.adg')
    if rack_id:
        print(f"✓ Successfully saved test rack with ID: {rack_id}")
    else:
        print("✗ Failed to save test rack")
        return
    
    # Test retrieval
    print("\nTesting retrieval...")
    retrieved_rack = db.get_rack_analysis(rack_id)
    if retrieved_rack:
        print(f"✓ Successfully retrieved rack: {retrieved_rack['rack_name']}")
    else:
        print("✗ Failed to retrieve rack")
    
    # Test search
    print("\nTesting search...")
    search_results = db.search_racks('Test')
    print(f"✓ Found {len(search_results)} rack(s) matching 'Test'")
    
    # Test recent racks
    print("\nTesting recent racks...")
    recent_racks = db.get_recent_racks(5)
    print(f"✓ Found {len(recent_racks)} recent rack(s)")
    
    # Cleanup - remove test rack
    if rack_id:
        try:
            from bson import ObjectId
            db.collection.delete_one({'_id': ObjectId(rack_id)})
            print(f"\n✓ Cleaned up test rack")
        except Exception as e:
            print(f"\n✗ Failed to cleanup test rack: {e}")
    
    db.close()
    print("\n✓ Test completed successfully!")

if __name__ == '__main__':
    # Show environment
    mongo_url = os.getenv('MONGO_URL', os.getenv('MONGODB_URI', 'Not set'))
    print(f"MongoDB URL from environment: {mongo_url if mongo_url != 'Not set' else 'Not set (will use localhost)'}")
    print()
    
    test_mongodb_connection()
