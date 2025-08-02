#!/usr/bin/env python3
"""
Backfill vector embeddings for existing racks in the database
"""

import os
import sys
from pathlib import Path
import logging
from tqdm import tqdm

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.db import db
from backend.vector_storage import vector_storage

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backfill_embeddings():
    """Backfill embeddings for all existing racks"""
    
    # Connect to MongoDB
    if not db.connect():
        logger.error("Failed to connect to MongoDB")
        return
    
    # Connect to Pinecone
    if not vector_storage.connect():
        logger.error("Failed to connect to Pinecone")
        return
    
    # Get all racks
    logger.info("Fetching all racks from database...")
    all_racks = []
    try:
        cursor = db.collection.find({})
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            all_racks.append(doc)
    except Exception as e:
        logger.error(f"Failed to fetch racks: {e}")
        return
    
    logger.info(f"Found {len(all_racks)} racks to process")
    
    # Process each rack
    success_count = 0
    error_count = 0
    
    for rack in tqdm(all_racks, desc="Processing racks"):
        rack_id = rack['_id']
        rack_name = rack.get('rack_name', 'Unknown')
        
        try:
            # Check if embedding already exists
            # We'll try to store it - if it already exists, Pinecone will update it
            if vector_storage.store_rack_embedding(rack_id, rack):
                logger.debug(f"Successfully stored embedding for rack: {rack_name} ({rack_id})")
                success_count += 1
            else:
                logger.warning(f"Failed to store embedding for rack: {rack_name} ({rack_id})")
                error_count += 1
                
        except Exception as e:
            logger.error(f"Error processing rack {rack_name} ({rack_id}): {e}")
            error_count += 1
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info(f"Backfill complete!")
    logger.info(f"Successfully processed: {success_count} racks")
    logger.info(f"Errors: {error_count} racks")
    logger.info("="*50)

if __name__ == "__main__":
    logger.info("Starting vector embedding backfill...")
    backfill_embeddings()
