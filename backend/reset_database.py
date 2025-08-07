#!/usr/bin/env python3
"""
Reset Railway database - remove old collections and start fresh with new schema
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db_new import db_new as db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_database():
    """Clear all collections and start fresh"""
    logger.info("Connecting to Railway database...")
    
    if not db.connect():
        logger.error("Failed to connect to database")
        return False
    
    logger.info("Connected to database. Resetting...")
    
    # Drop old collections
    collections_to_drop = [
        'racks', 'users', 'annotations', 'comments', 
        'ratings', 'favorites', 'collections'
    ]
    
    for collection_name in collections_to_drop:
        try:
            db.db.drop_collection(collection_name)
            logger.info(f"Dropped collection: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not drop {collection_name}: {e}")
    
    logger.info("Database reset complete! New schema will be created on first use.")
    return True

if __name__ == "__main__":
    reset_database()
