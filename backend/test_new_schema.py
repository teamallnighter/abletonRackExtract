#!/usr/bin/env python3
"""
Test the new database schema with sample data
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_new import AbletonRackDBNew
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_new_schema():
    """Test the new database schema with sample data"""
    # Use local MongoDB for testing
    os.environ['MONGO_URL'] = 'mongodb://localhost:27017/'
    
    db = AbletonRackDBNew()
    
    if not db.connect():
        logger.error("Failed to connect to local database")
        return False
    
    logger.info("Connected to local test database")
    
    # Create a test rack with embedded data
    test_rack = {
        'filename': 'test-rack.adg',
        'rack_name': 'Test Synth Rack',
        'rack_type': 'Instrument',
        'user_id': 'test_user_123',
        'producer_name': 'Test Producer',
        'analysis': {
            'devices': ['Wavetable', 'Reverb'],
            'macro_controls': [
                {'name': 'Filter', 'mapped': True, 'value': 64}
            ]
        },
        'metadata': {
            'title': 'Amazing Synth',
            'description': 'A powerful synth rack for leads',
            'tags': ['synth', 'lead', 'electronic']
        }
    }
    
    # Insert the rack
    rack_id = db.racks_collection.insert_one(test_rack).inserted_id
    logger.info(f"Created test rack: {rack_id}")
    
    # Test adding annotation
    success = db.add_annotation(
        str(rack_id), 
        'test_user_123', 
        'testuser',
        {
            'type': 'tip',
            'content': 'This filter sounds great for leads!',
            'position': {'x': 100, 'y': 200}
        }
    )
    logger.info(f"Added annotation: {success}")
    
    # Test adding comment
    success = db.add_comment(
        str(rack_id),
        'test_user_123', 
        'Love this rack! Great sound design.',
        'testuser'
    )
    logger.info(f"Added comment: {success}")
    
    # Test rating
    success = db.rate_rack(
        str(rack_id),
        'test_user_123',
        5,
        'testuser',
        'Perfect for my style of music'
    )
    logger.info(f"Added rating: {success}")
    
    # Get complete rack data
    complete_rack = db.get_rack_with_full_data(str(rack_id))
    
    if complete_rack:
        logger.info("✅ Successfully retrieved complete rack data!")
        logger.info(f"  - Annotations: {len(complete_rack.get('annotations', []))}")
        logger.info(f"  - Comments: {len(complete_rack.get('comments', []))}")
        logger.info(f"  - Average rating: {complete_rack.get('engagement', {}).get('ratings', {}).get('average', 'N/A')}")
        return True
    else:
        logger.error("❌ Failed to retrieve complete rack data")
        return False

if __name__ == "__main__":
    test_new_schema()
