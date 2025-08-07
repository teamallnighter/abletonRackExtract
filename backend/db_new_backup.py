"""
New MongoDB database implementation with proper document-based design
This replaces the over-engineered relational approach in db.py
"""

import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging
import bcrypt
from bson import ObjectId
import base64
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class MongoDBNew:
    """
    Redesigned MongoDB implementation that embraces document-based architecture
    """
    
    def __init__(self):
        self.client = None
        self.db = None
        self.racks_collection = None
        self.users_collection = None
        self.connected = False
        
    def connect(self):
        """Connect to MongoDB"""
        try:
            mongo_url = os.getenv('MONGO_URL', os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
            
            if not mongo_url:
                logger.warning("No MongoDB URL found. Using local MongoDB.")
                mongo_url = 'mongodb://localhost:27017/'
            
            self.client = MongoClient(mongo_url)
            self.client.admin.command('ping')
            
            # Use database
            self.db = self.client.ableton_rack_analyzer_v2  # New database name
            self.racks_collection = self.db.racks
            self.users_collection = self.db.users
            
            # Create indexes for racks
            self.racks_collection.create_index('filename')
            self.racks_collection.create_index('created_at')
            self.racks_collection.create_index('rack_name')
            self.racks_collection.create_index('producer_name')
            self.racks_collection.create_index('user_id')
            self.racks_collection.create_index('metadata.tags')
            self.racks_collection.create_index('engagement.ratings.average')
            self.racks_collection.create_index('engagement.download_count')
            
            # Text search index
            self.racks_collection.create_index([
                ('rack_name', 'text'),
                ('metadata.title', 'text'),
                ('metadata.description', 'text'),
                ('metadata.tags', 'text'),
                ('producer_name', 'text')
            ])
            
            # Create indexes for users
            self.users_collection.create_index('username', unique=True)
            self.users_collection.create_index('email', unique=True)
            
            self.connected = True
            logger.info("Successfully connected to MongoDB (New Schema)")
            return True
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            self.connected = False
            return False
    
    def save_rack_analysis(self, rack_info: Dict, filename: str, 
                          file_content: bytes = None, user_id: str = None, 
                          enhanced_metadata: Dict = None) -> Optional[str]:
        """Save rack with embedded annotations, ratings, and comments"""
        if not self.connected and not self.connect():
            return None
        
        try:
            # Build the complete rack document
            document = {
                # Basic rack information
                'filename': filename,
                'rack_name': rack_info.get('rack_name', 'Unknown'),
                'rack_type': rack_info.get('rack_type', 'Unknown'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                
                # User/Producer information
                'user_id': user_id,  # None for anonymous uploads
                'producer_name': enhanced_metadata.get('producer_name', '') if enhanced_metadata else '',
                
                # Core analysis data
                'analysis': rack_info,
                
                # Metadata
                'metadata': {
                    'title': enhanced_metadata.get('title', rack_info.get('rack_name', 'Unknown')) if enhanced_metadata else rack_info.get('rack_name', 'Unknown'),
                    'description': enhanced_metadata.get('description', '') if enhanced_metadata else '',
                    'difficulty': enhanced_metadata.get('difficulty', 'unknown') if enhanced_metadata else 'unknown',
                    'version': enhanced_metadata.get('version', '1.0') if enhanced_metadata else '1.0',
                    'tags': enhanced_metadata.get('tags', []) if enhanced_metadata else [],
                    'genre_tags': enhanced_metadata.get('genre_tags', []) if enhanced_metadata else [],
                    'device_tags': self._extract_device_tags(rack_info)
                },
                
                # Engagement metrics (embedded for single-query performance)
                'engagement': {
                    'view_count': 0,
                    'download_count': 0,
                    'favorite_count': 0,
                    'ratings': {
                        'average': 0.0,
                        'count': 0,
                        'distribution': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0},
                        'user_ratings': []  # Embedded ratings
                    }
                },
                
                # Comments embedded (they belong to this specific rack)
                'comments': [],
                
                # Annotations embedded (visual overlays for this specific rack)
                'annotations': [],
                
                # Statistics
                'stats': {
                    'total_chains': len(rack_info.get('chains', [])),
                    'total_devices': self._count_all_devices(rack_info.get('chains', [])),
                    'macro_controls': len(rack_info.get('macro_controls', [])),
                    'complexity_score': self._calculate_complexity_score(rack_info)
                },
                
                # File references
                'files': {
                    'original_file': {
                        'size': len(file_content) if file_content else 0,
                        'checksum': None
                    },
                    'preview_audio': None,
                    'thumbnail': None
                }
            }
            
            # Store file content if provided
            if file_content:
                document['file_content'] = base64.b64encode(file_content).decode('utf-8')
            
            # Insert into MongoDB
            result = self.racks_collection.insert_one(document)
            logger.info(f"Saved rack analysis with ID: {result.inserted_id}")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to save rack analysis: {e}")
            return None
    
    def get_rack_with_full_data(self, rack_id: str) -> Optional[Dict]:
        """Get complete rack data including annotations, comments, ratings in single query"""
        if not self.connected and not self.connect():
            return None
        
        try:
            if not ObjectId.is_valid(rack_id):
                logger.error(f"Invalid ObjectId format: {rack_id}")
                return None
                
            # Single query gets everything - no joins needed!
            document = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            
            if document:
                document['_id'] = str(document['_id'])
                
                # Increment view count
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$inc': {'engagement.view_count': 1}}
                )
                
                return document
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get rack: {e}")
            return None
    
    def add_annotation(self, rack_id: str, user_id: str, annotation_data: Dict) -> bool:
        """Add annotation directly to rack document"""
        if not self.connected and not self.connect():
            return False
        
        try:
            annotation = {
                'id': str(ObjectId()),  # Generate unique ID for annotation
                'user_id': user_id,
                'type': annotation_data.get('type', 'general'),
                'component_id': annotation_data.get('component_id'),
                'position': annotation_data.get('position', {'x': 0, 'y': 0}),
                'content': annotation_data.get('content', ''),
                'created_at': datetime.utcnow()
            }
            
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$push': {'annotations': annotation},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add annotation: {e}")
            return False
    
    def add_comment(self, rack_id: str, user_id: str, content: str, 
                   username: str, parent_comment_id: str = None) -> bool:
        """Add comment directly to rack document"""
        if not self.connected and not self.connect():
            return False
        
        try:
            comment = {
                'id': str(ObjectId()),
                'user_id': user_id,
                'username': username,  # Denormalized for performance
                'content': content,
                'parent_comment_id': parent_comment_id,
                'created_at': datetime.utcnow(),
                'likes': 0,
                'replies': [] if not parent_comment_id else None
            }
            
            if parent_comment_id:
                # Add as reply to existing comment
                result = self.racks_collection.update_one(
                    {
                        '_id': ObjectId(rack_id),
                        'comments.id': parent_comment_id
                    },
                    {
                        '$push': {'comments.$.replies': comment},
                        '$set': {'updated_at': datetime.utcnow()}
                    }
                )
            else:
                # Add as top-level comment
                result = self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {
                        '$push': {'comments': comment},
                        '$set': {'updated_at': datetime.utcnow()}
                    }
                )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add comment: {e}")
            return False
    
    def rate_rack(self, rack_id: str, user_id: str, rating: int, 
                 username: str, review: str = None) -> bool:
        """Add/update rating directly in rack document"""
        if not self.connected and not self.connect():
            return False
        
        try:
            if not 1 <= rating <= 5:
                return False
            
            # Remove existing rating from this user first
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$pull': {'engagement.ratings.user_ratings': {'user_id': user_id}}}
            )
            
            # Add new rating
            rating_obj = {
                'user_id': user_id,
                'username': username,
                'rating': rating,
                'review': review,
                'created_at': datetime.utcnow()
            }
            
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$push': {'engagement.ratings.user_ratings': rating_obj},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                # Recalculate average rating
                self._recalculate_rating(rack_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to rate rack: {e}")
            return False
    
    def _recalculate_rating(self, rack_id: str):
        """Recalculate average rating from embedded ratings"""
        try:
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if not rack:
                return
            
            ratings = rack.get('engagement', {}).get('ratings', {}).get('user_ratings', [])
            
            if not ratings:
                return
            
            # Calculate new average and distribution
            total_ratings = len(ratings)
            sum_ratings = sum(r['rating'] for r in ratings)
            average = round(sum_ratings / total_ratings, 2)
            
            distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            for rating_obj in ratings:
                distribution[str(rating_obj['rating'])] += 1
            
            # Update the rack
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'engagement.ratings.average': average,
                        'engagement.ratings.count': total_ratings,
                        'engagement.ratings.distribution': distribution
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to recalculate rating: {e}")
    
    def get_recent_racks(self, limit: int = 10) -> List[Dict]:
        """Get recent racks with embedded data"""
        if not self.connected and not self.connect():
            return []
        
        try:
            cursor = self.racks_collection.find().sort('created_at', -1).limit(limit)
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to get recent racks: {e}")
            return []
    
    def search_racks(self, query: str) -> List[Dict]:
        """Text search across rack content"""
        if not self.connected and not self.connect():
            return []
        
        try:
            # Use MongoDB text search
            cursor = self.racks_collection.find(
                {'$text': {'$search': query}}
            ).sort('created_at', -1)
            
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to search racks: {e}")
            return []
    
    def increment_download_count(self, rack_id: str) -> bool:
        """Increment download count"""
        if not self.connected and not self.connect():
            return False
        
        try:
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$inc': {'engagement.download_count': 1}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to increment download count: {e}")
            return False
    
    def _count_all_devices(self, chains: List) -> int:
        """Count all devices including nested ones"""
        count = 0
        for chain in chains:
            for device in chain.get('devices', []):
                count += 1
                if 'chains' in device:
                    count += self._count_all_devices(device['chains'])
        return count
    
    def _extract_device_tags(self, rack_info: Dict) -> List[str]:
        """Extract device names as tags"""
        device_tags = set()
        
        def extract_from_chains(chains):
            for chain in chains:
                for device in chain.get('devices', []):
                    device_name = device.get('name', '').strip()
                    if device_name and device_name != 'Unknown':
                        tag = device_name.lower().replace(' ', '-')
                        device_tags.add(tag)
                    
                    if 'chains' in device:
                        extract_from_chains(device['chains'])
        
        chains = rack_info.get('chains', [])
        extract_from_chains(chains)
        return list(device_tags)
    
    def _calculate_complexity_score(self, rack_info: Dict) -> int:
        """Calculate complexity score"""
        try:
            chains = rack_info.get('chains', [])
            devices = rack_info.get('devices', [])
            macro_controls = rack_info.get('macro_controls', [])
            
            chain_count = len(chains)
            device_count = self._count_all_devices(chains) + len(devices)
            macro_count = len(macro_controls)
            
            def max_depth(chains, current_depth=0):
                if not chains:
                    return current_depth
                max_d = current_depth
                for chain in chains:
                    for device in chain.get('devices', []):
                        if 'chains' in device:
                            depth = max_depth(device['chains'], current_depth + 1)
                            max_d = max(max_d, depth)
                return max_d
            
            nesting_depth = max_depth(chains)
            
            complexity = min(100, (
                device_count * 2 +
                chain_count * 3 +
                macro_count * 1 +
                nesting_depth * 5
            ))
            
            return complexity
            
        except Exception as e:
            logger.error(f"Failed to calculate complexity score: {e}")
            return 0

# Create global instance
db_new = MongoDBNew()
