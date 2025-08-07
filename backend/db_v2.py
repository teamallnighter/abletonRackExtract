"""
New MongoDB operations using proper document-based design
This replaces the over-engineered relational approach
"""

import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging
import bcrypt
from bson import ObjectId
import base64
import uuid

logger = logging.getLogger(__name__)

class MongoDBRedesigned:
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
                mongo_url = 'mongodb://localhost:27017/'
            
            self.client = MongoClient(mongo_url)
            self.client.admin.command('ping')
            
            self.db = self.client.ableton_rack_analyzer
            self.racks_collection = self.db.racks_v2  # New collection
            self.users_collection = self.db.users_v2  # New collection
            
            # Create indexes for the new schema
            self._create_indexes()
            
            self.connected = True
            logger.info("Connected to MongoDB with redesigned schema")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def _create_indexes(self):
        """Create optimized indexes for the new schema"""
        # Rack indexes
        self.racks_collection.create_index('filename')
        self.racks_collection.create_index('created_at')
        self.racks_collection.create_index('user_id')
        self.racks_collection.create_index('producer_name')
        self.racks_collection.create_index('metadata.tags')
        self.racks_collection.create_index('engagement.ratings.average')
        self.racks_collection.create_index('engagement.download_count')
        
        # Compound indexes for common queries
        self.racks_collection.create_index([('metadata.tags', 1), ('engagement.ratings.average', -1)])
        self.racks_collection.create_index([('user_id', 1), ('created_at', -1)])
        
        # Text search index
        self.racks_collection.create_index([
            ('rack_name', 'text'),
            ('metadata.title', 'text'),
            ('metadata.description', 'text'),
            ('metadata.tags', 'text'),
            ('producer_name', 'text')
        ])
        
        # User indexes
        self.users_collection.create_index('username', unique=True)
        self.users_collection.create_index('email', unique=True)
        self.users_collection.create_index('favorites.rack_ids')
    
    # RACK OPERATIONS
    
    def save_rack_analysis(self, rack_info, filename, file_content=None, user_id=None, enhanced_metadata=None):
        """Save rack analysis with embedded related data"""
        if not self.connected and not self.connect():
            return None
        
        try:
            # Extract basic info
            user_info = rack_info.get('user_info', {})
            
            document = {
                'filename': filename,
                'rack_name': rack_info.get('rack_name', 'Unknown'),
                'rack_type': rack_info.get('rack_type', 'Unknown'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                
                # User information
                'user_id': user_id,
                'producer_name': user_info.get('producer_name', '') or enhanced_metadata.get('producer_name', '') if enhanced_metadata else '',
                
                # Core analysis data
                'analysis': rack_info,
                
                # Metadata
                'metadata': {
                    'title': enhanced_metadata.get('title', user_info.get('rack_name', rack_info.get('rack_name', 'Unknown'))) if enhanced_metadata else user_info.get('rack_name', rack_info.get('rack_name', 'Unknown')),
                    'description': enhanced_metadata.get('description', user_info.get('description', '')) if enhanced_metadata else user_info.get('description', ''),
                    'difficulty': enhanced_metadata.get('difficulty') if enhanced_metadata else None,
                    'version': enhanced_metadata.get('version', '1.0') if enhanced_metadata else '1.0',
                    'tags': enhanced_metadata.get('tags', user_info.get('tags', [])) if enhanced_metadata else user_info.get('tags', []),
                    'genre_tags': enhanced_metadata.get('genre_tags', []) if enhanced_metadata else []
                },
                
                # Engagement metrics (embedded)
                'engagement': {
                    'view_count': 0,
                    'download_count': 0,
                    'favorite_count': 0,
                    'ratings': {
                        'average': 0.0,
                        'count': 0,
                        'distribution': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0},
                        'user_ratings': []
                    }
                },
                
                # Comments embedded (they belong to this rack)
                'comments': [],
                
                # Annotations embedded (they're visual overlays on this rack)
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
                        'content': base64.b64encode(file_content).decode('utf-8') if file_content else None
                    }
                }
            }
            
            result = self.racks_collection.insert_one(document)
            logger.info(f"Saved rack with new schema: {result.inserted_id}")
            
            # Update user stats if user is provided
            if user_id:
                self._update_user_stats(user_id, 'upload')
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to save rack: {e}")
            return None
    
    def get_rack_complete(self, rack_id):
        """Get complete rack data including annotations, comments, ratings"""
        if not self.connected and not self.connect():
            return None
        
        try:
            if not ObjectId.is_valid(rack_id):
                return None
            
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if rack:
                rack['_id'] = str(rack['_id'])
                
                # Increment view count
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$inc': {'engagement.view_count': 1}}
                )
            
            return rack
            
        except Exception as e:
            logger.error(f"Failed to get rack: {e}")
            return None
    
    def add_annotation(self, rack_id, user_id, username, annotation_data):
        """Add annotation to a rack"""
        if not self.connected and not self.connect():
            return None
        
        try:
            annotation = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'username': username,  # Denormalized for performance
                'type': annotation_data.get('type', 'general'),
                'component_id': annotation_data.get('component_id'),
                'position': annotation_data.get('position', {'x': 0, 'y': 0}),
                'content': annotation_data.get('content', ''),
                'created_at': datetime.utcnow()
            }
            
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$push': {'annotations': annotation}}
            )
            
            return annotation['id'] if result.modified_count > 0 else None
            
        except Exception as e:
            logger.error(f"Failed to add annotation: {e}")
            return None
    
    def add_comment(self, rack_id, user_id, username, content, parent_id=None):
        """Add comment to a rack"""
        if not self.connected and not self.connect():
            return None
        
        try:
            comment = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'username': username,  # Denormalized
                'content': content,
                'created_at': datetime.utcnow(),
                'likes': 0,
                'replies': [] if not parent_id else None  # Only top-level comments have replies
            }
            
            if parent_id:
                # Add as reply to existing comment
                result = self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id), 'comments.id': parent_id},
                    {'$push': {'comments.$.replies': comment}}
                )
            else:
                # Add as top-level comment
                result = self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$push': {'comments': comment}}
                )
            
            return comment['id'] if result.modified_count > 0 else None
            
        except Exception as e:
            logger.error(f"Failed to add comment: {e}")
            return None
    
    def rate_rack(self, rack_id, user_id, username, rating, review=None):
        """Rate a rack (embedded in rack document)"""
        if not self.connected and not self.connect():
            return False
        
        try:
            # Remove existing rating from this user
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$pull': {'engagement.ratings.user_ratings': {'user_id': user_id}}}
            )
            
            # Add new rating
            new_rating = {
                'user_id': user_id,
                'username': username,  # Denormalized
                'rating': rating,
                'review': review,
                'created_at': datetime.utcnow()
            }
            
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$push': {'engagement.ratings.user_ratings': new_rating}}
            )
            
            if result.modified_count > 0:
                # Recalculate average rating
                self._recalculate_rack_rating(rack_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to rate rack: {e}")
            return False
    
    def _recalculate_rack_rating(self, rack_id):
        """Recalculate average rating for a rack"""
        try:
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if not rack:
                return
            
            ratings = rack.get('engagement', {}).get('ratings', {}).get('user_ratings', [])
            
            if not ratings:
                return
            
            # Calculate new averages
            total = len(ratings)
            sum_ratings = sum(r['rating'] for r in ratings)
            average = round(sum_ratings / total, 2)
            
            # Calculate distribution
            distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            for rating in ratings:
                distribution[str(rating['rating'])] += 1
            
            # Update the rack
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$set': {
                    'engagement.ratings.average': average,
                    'engagement.ratings.count': total,
                    'engagement.ratings.distribution': distribution
                }}
            )
            
        except Exception as e:
            logger.error(f"Failed to recalculate rating: {e}")
    
    # USER OPERATIONS
    
    def create_user(self, username, email, password):
        """Create user with embedded collections and favorites"""
        if not self.connected and not self.connect():
            return None
        
        try:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            user_doc = {
                'username': username.lower(),
                'email': email.lower(),
                'password_hash': password_hash,
                'created_at': datetime.utcnow(),
                'last_login': None,
                
                # Profile information
                'profile': {
                    'display_name': username,
                    'bio': '',
                    'location': '',
                    'website': '',
                    'avatar_url': None
                },
                
                # User's collections (embedded)
                'collections': [],
                
                # User's favorites (embedded)
                'favorites': {
                    'rack_ids': [],
                    'last_updated': datetime.utcnow()
                },
                
                # User statistics
                'stats': {
                    'uploads_count': 0,
                    'total_downloads': 0,
                    'total_favorites_received': 0,
                    'average_rating': 0.0
                }
            }
            
            result = self.users_collection.insert_one(user_doc)
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None
    
    def toggle_favorite(self, user_id, rack_id):
        """Toggle favorite (embedded in user document)"""
        if not self.connected and not self.connect():
            return None
        
        try:
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return None
            
            favorites = user.get('favorites', {}).get('rack_ids', [])
            
            if rack_id in favorites:
                # Remove favorite
                self.users_collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {
                        '$pull': {'favorites.rack_ids': rack_id},
                        '$set': {'favorites.last_updated': datetime.utcnow()}
                    }
                )
                
                # Decrease favorite count on rack
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$inc': {'engagement.favorite_count': -1}}
                )
                
                return False  # Not favorited
            else:
                # Add favorite
                self.users_collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {
                        '$push': {'favorites.rack_ids': rack_id},
                        '$set': {'favorites.last_updated': datetime.utcnow()}
                    }
                )
                
                # Increase favorite count on rack
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$inc': {'engagement.favorite_count': 1}}
                )
                
                return True  # Now favorited
                
        except Exception as e:
            logger.error(f"Failed to toggle favorite: {e}")
            return None
    
    def get_user_favorites(self, user_id):
        """Get user's favorite racks"""
        if not self.connected and not self.connect():
            return []
        
        try:
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return []
            
            rack_ids = user.get('favorites', {}).get('rack_ids', [])
            if not rack_ids:
                return []
            
            # Convert to ObjectIds
            object_ids = [ObjectId(rid) for rid in rack_ids if ObjectId.is_valid(rid)]
            
            # Get the racks
            racks = list(self.racks_collection.find({'_id': {'$in': object_ids}}))
            for rack in racks:
                rack['_id'] = str(rack['_id'])
                rack['is_favorited'] = True
            
            return racks
            
        except Exception as e:
            logger.error(f"Failed to get user favorites: {e}")
            return []
    
    def _update_user_stats(self, user_id, action):
        """Update user statistics"""
        try:
            if action == 'upload':
                self.users_collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {'$inc': {'stats.uploads_count': 1}}
                )
        except Exception as e:
            logger.error(f"Failed to update user stats: {e}")
    
    def _count_all_devices(self, chains):
        """Count all devices including nested ones"""
        count = 0
        for chain in chains:
            for device in chain.get('devices', []):
                count += 1
                if 'chains' in device:
                    count += self._count_all_devices(device['chains'])
        return count
    
    def _calculate_complexity_score(self, rack_info):
        """Calculate complexity score"""
        try:
            chains = rack_info.get('chains', [])
            device_count = self._count_all_devices(chains)
            macro_count = len(rack_info.get('macro_controls', []))
            
            return min(100, device_count * 2 + len(chains) * 3 + macro_count)
        except:
            return 0

# Create instance
db_v2 = MongoDBRedesigned()
