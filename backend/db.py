"""
MongoDB connection and operations for Ableton Rack Analyzer
"""

import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging

# Set up logging
logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.connected = False
        
    def connect(self):
        """Connect to MongoDB using Railway environment variable"""
        try:
            # Railway provides MONGO_URL environment variable when MongoDB is attached
            mongo_url = os.getenv('MONGO_URL', os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
            
            if not mongo_url:
                logger.warning("No MongoDB URL found in environment variables. Using local MongoDB.")
                mongo_url = 'mongodb://localhost:27017/'
            
            # Connect to MongoDB
            self.client = MongoClient(mongo_url)
            
            # Test the connection
            self.client.admin.command('ping')
            
            # Use database
            self.db = self.client.ableton_rack_analyzer
            self.collection = self.db.racks
            
            # Create indexes
            self.collection.create_index('filename')
            self.collection.create_index('created_at')
            self.collection.create_index('rack_name')
            self.collection.create_index('producer_name')
            self.collection.create_index('description')
            self.collection.create_index('tags')
            
            self.connected = True
            logger.info("Successfully connected to MongoDB")
            return True
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            self.connected = False
            return False
    
    def save_rack_analysis(self, rack_info, filename, file_content=None):
        """Save rack analysis to MongoDB"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            # Prepare document
            document = {
                'filename': filename,
                'rack_name': rack_info.get('rack_name', 'Unknown'),
                'analysis': rack_info,
                'created_at': datetime.utcnow(),
                'stats': {
                    'total_chains': len(rack_info.get('chains', [])),
                    'total_devices': self._count_all_devices(rack_info.get('chains', [])),
                    'macro_controls': len(rack_info.get('macro_controls', []))
                }
            }
            
            # Add user info if present
            if 'user_info' in rack_info:
                document['user_info'] = rack_info['user_info']
                # Also add fields at top level for easier searching
                if 'description' in rack_info['user_info']:
                    document['description'] = rack_info['user_info']['description']
                if 'producer_name' in rack_info['user_info']:
                    document['producer_name'] = rack_info['user_info']['producer_name']
                if 'tags' in rack_info['user_info']:
                    document['tags'] = rack_info['user_info']['tags']
            
            # Optionally store the original file content (base64 encoded)
            if file_content:
                import base64
                document['file_content'] = base64.b64encode(file_content).decode('utf-8')
            
            # Insert into MongoDB
            result = self.collection.insert_one(document)
            logger.info(f"Saved rack analysis to MongoDB with ID: {result.inserted_id}")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to save rack analysis: {e}")
            return None
    
    def get_rack_analysis(self, rack_id):
        """Get rack analysis by ID"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            from bson import ObjectId
            document = self.collection.find_one({'_id': ObjectId(rack_id)})
            if document:
                document['_id'] = str(document['_id'])
            return document
        except Exception as e:
            logger.error(f"Failed to get rack analysis: {e}")
            return None
    
    def get_recent_racks(self, limit=10):
        """Get recently analyzed racks"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.collection.find().sort('created_at', -1).limit(limit)
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to get recent racks: {e}")
            return []
    
    def search_racks(self, query):
        """Search racks by name or filename"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            # Search in rack_name, filename, producer_name, and description
            cursor = self.collection.find({
                '$or': [
                    {'rack_name': {'$regex': query, '$options': 'i'}},
                    {'filename': {'$regex': query, '$options': 'i'}},
                    {'producer_name': {'$regex': query, '$options': 'i'}},
                    {'description': {'$regex': query, '$options': 'i'}}
                ]
            }).sort('created_at', -1)
            
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to search racks: {e}")
            return []
    
    def _count_all_devices(self, chains):
        """Count all devices including nested ones"""
        count = 0
        for chain in chains:
            for device in chain.get('devices', []):
                count += 1
                if 'chains' in device:
                    count += self._count_all_devices(device['chains'])
        return count
    
    def get_popular_tags(self, limit=20):
        """Get most popular tags with usage count"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            # Aggregate to count tag usage
            pipeline = [
                {"$unwind": "$tags"},
                {"$group": {
                    "_id": "$tags",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}},
                {"$limit": limit},
                {"$project": {
                    "name": "$_id",
                    "count": 1,
                    "_id": 0
                }}
            ]
            
            result = list(self.collection.aggregate(pipeline))
            return result
        except Exception as e:
            logger.error(f"Failed to get popular tags: {e}")
            return []
    
    def search_by_tags(self, tags):
        """Search racks that have any of the specified tags"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.collection.find({
                'tags': {'$in': tags}
            }).sort('created_at', -1)
            
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to search by tags: {e}")
            return []
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.connected = False
            logger.info("MongoDB connection closed")

# Create a global instance
db = MongoDB()
