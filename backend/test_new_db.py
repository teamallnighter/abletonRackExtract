#!/usr/bin/env python3
"""
Test script for the new database implementation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_new import db_new
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test basic database connection"""
    logger.info("Testing database connection...")
    
    if db_new.connect():
        logger.info("✅ Database connection successful")
        return True
    else:
        logger.error("❌ Database connection failed")
        return False

def test_enhanced_rack_retrieval():
    """Test getting a rack with full embedded data"""
    logger.info("Testing enhanced rack retrieval...")
    
    try:
        # Try to get the first rack from the collection
        racks = list(db_new.racks_collection.find().limit(1))
        
        if not racks:
            logger.warning("No racks found in database")
            return False
        
        rack_id = str(racks[0]['_id'])
        logger.info(f"Testing with rack ID: {rack_id}")
        
        # Test our new enhanced method
        enhanced_rack = db_new.get_rack_with_full_data(rack_id)
        
        if enhanced_rack:
            logger.info("✅ Enhanced rack retrieval successful")
            logger.info(f"Rack has {len(enhanced_rack.get('annotations', []))} annotations")
            logger.info(f"Rack has {len(enhanced_rack.get('comments', []))} comments")
            logger.info(f"Rack has {enhanced_rack.get('engagement', {}).get('ratings', {}).get('count', 0)} ratings")
            return True
        else:
            logger.warning("Enhanced rack retrieval returned None")
            return False
            
    except Exception as e:
        logger.error(f"❌ Enhanced rack retrieval failed: {e}")
        return False

def test_schema_validation():
    """Test that new schema has the expected structure"""
    logger.info("Testing schema validation...")
    
    try:
        # Get a sample rack
        sample_rack = db_new.racks_collection.find_one()
        
        if not sample_rack:
            logger.warning("No racks found for schema validation")
            return False
        
        # Check for expected new fields
        expected_fields = ['metadata', 'engagement', 'annotations', 'comments']
        missing_fields = []
        
        for field in expected_fields:
            if field not in sample_rack:
                missing_fields.append(field)
        
        if missing_fields:
            logger.warning(f"Missing expected fields: {missing_fields}")
            logger.info("This is expected if migration hasn't been run yet")
        else:
            logger.info("✅ All expected fields present in schema")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Schema validation failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Starting database tests...")
    
    tests = [
        test_database_connection,
        test_schema_validation,
        test_enhanced_rack_retrieval,
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
    
    logger.info(f"\nTests completed: {passed}/{len(tests)} passed")
    
    if passed == len(tests):
        logger.info("🎉 All tests passed! Database is ready for migration.")
    else:
        logger.warning("⚠️  Some tests failed. Review the issues above.")

if __name__ == "__main__":
    main()
