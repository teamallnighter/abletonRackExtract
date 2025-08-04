"""
MongoDB connection and operations for Ableton Rack Analyzer
"""

import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging
import bcrypt
from bson import ObjectId
import base64

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
            self.users_collection = self.db.users
            
            # Create indexes for racks - Enhanced for PRD requirements
            self.collection.create_index('filename')
            self.collection.create_index('created_at')
            self.collection.create_index('rack_name')
            self.collection.create_index('producer_name')
            self.collection.create_index('description')
            self.collection.create_index('tags')
            self.collection.create_index('user_id')
            self.collection.create_index('download_count')
            self.collection.create_index('rack_type')
            
            # Enhanced indexes for new metadata fields
            self.collection.create_index('metadata.title')
            self.collection.create_index('metadata.genre')
            self.collection.create_index('metadata.difficulty')
            self.collection.create_index('engagement.rating.average')
            self.collection.create_index([('tags.user_tags', 1), ('metadata.genre', 1)])
            
            # Text search index for enhanced search
            self.collection.create_index([
                ('metadata.title', 'text'),
                ('metadata.description', 'text'),
                ('tags.user_tags', 'text')
            ])
            
            # Create favorites collection
            self.favorites_collection = self.db.favorites
            self.favorites_collection.create_index([('user_id', 1), ('rack_id', 1)], unique=True)
            self.favorites_collection.create_index('created_at')
            
            # Create comments collection
            self.comments_collection = self.db.comments
            self.comments_collection.create_index('rack_id')
            self.comments_collection.create_index('user_id')
            self.comments_collection.create_index('created_at')
            self.comments_collection.create_index('parent_comment_id')
            
            # Create ratings collection
            self.ratings_collection = self.db.ratings
            self.ratings_collection.create_index([('user_id', 1), ('rack_id', 1)], unique=True)
            self.ratings_collection.create_index('rack_id')
            self.ratings_collection.create_index('rating')
            
            # Create collections (playlists) collection
            self.collections_collection = self.db.collections
            self.collections_collection.create_index('user_id')
            self.collections_collection.create_index('is_public')
            self.collections_collection.create_index('created_at')
            
            # Create annotations collection
            self.annotations_collection = self.db.annotations
            self.annotations_collection.create_index('rack_id')
            self.annotations_collection.create_index('user_id')
            self.annotations_collection.create_index('component_id')
            self.annotations_collection.create_index('created_at')
            
            # Create indexes for users
            self.users_collection.create_index('username', unique=True)
            self.users_collection.create_index('email', unique=True)
            
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
    
    def save_rack_analysis(self, rack_info, filename, file_content=None, user_id=None, enhanced_metadata=None):
        """Save rack analysis to MongoDB with enhanced metadata support"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            # Prepare base document
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
            
            # Enhanced metadata structure
            if enhanced_metadata:
                document['metadata'] = {
                    'title': enhanced_metadata.get('title', rack_info.get('rack_name', 'Unknown')),
                    'description': enhanced_metadata.get('description', ''),
                    'genre': enhanced_metadata.get('genre'),
                    'bpm': enhanced_metadata.get('bpm'),
                    'key': enhanced_metadata.get('key'),
                    'difficulty': enhanced_metadata.get('difficulty'),
                    'copyright': enhanced_metadata.get('copyright'),
                    'version': enhanced_metadata.get('version', '1.0'),
                    'parent_rack_id': enhanced_metadata.get('parent_rack_id')
                }
                
                # Enhanced tagging system
                document['tags'] = {
                    'user_tags': enhanced_metadata.get('tags', []),
                    'auto_tags': enhanced_metadata.get('auto_tags', []),
                    'device_tags': self._extract_device_tags(rack_info),
                    'genre_tags': enhanced_metadata.get('genre_tags', [])
                }
            else:
                # Legacy support - convert old user_info to new structure
                user_info = rack_info.get('user_info', {})
                document['metadata'] = {
                    'title': user_info.get('rack_name', rack_info.get('rack_name', 'Unknown')),
                    'description': user_info.get('description', ''),
                    'version': '1.0'
                }
                document['tags'] = {
                    'user_tags': user_info.get('tags', []),
                    'auto_tags': [],
                    'device_tags': self._extract_device_tags(rack_info),
                    'genre_tags': []
                }
                
                # Maintain backward compatibility
                document['user_info'] = user_info
                document['description'] = user_info.get('description', '')
                document['producer_name'] = user_info.get('producer_name', '')
                document['tags'] = user_info.get('tags', []) if 'tags' in user_info else document['tags']['user_tags']
                document['rack_type'] = user_info.get('rack_type')
            
            # Initialize engagement metrics
            document['engagement'] = {
                'view_count': 0,
                'download_count': 0,
                'favorite_count': 0,
                'comment_count': 0,
                'fork_count': 0,
                'rating': {
                    'average': 0.0,
                    'count': 0,
                    'distribution': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
                }
            }
            
            # File storage references
            document['files'] = {
                'original_file': {
                    'url': None,  # Will be populated when files are uploaded to CDN
                    'size': len(file_content) if file_content else 0,
                    'checksum': None
                },
                'preview_audio': None,
                'thumbnail': None,
                'exports': {
                    'xml': None,
                    'json': None,
                    'midi': None
                }
            }
            
            # Performance tracking
            document['performance'] = {
                'analysis_time': None,
                'complexity_score': self._calculate_complexity_score(rack_info),
                'cpu_usage_estimate': None
            }
            
            # Add user_id if provided
            if user_id:
                document['user_id'] = user_id
            
            # Optionally store the original file content (base64 encoded)
            if file_content:
                document['file_content'] = base64.b64encode(file_content).decode('utf-8')
            
            # Insert into MongoDB
            result = self.collection.insert_one(document)
            logger.info(f"Saved enhanced rack analysis to MongoDB with ID: {result.inserted_id}")
            
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
    
    def _extract_device_tags(self, rack_info):
        """Extract device names as tags for search optimization"""
        device_tags = set()
        
        def extract_from_chains(chains):
            for chain in chains:
                for device in chain.get('devices', []):
                    device_name = device.get('name', '').strip()
                    if device_name and device_name != 'Unknown':
                        # Clean up device names for tags
                        tag = device_name.lower().replace(' ', '-')
                        device_tags.add(tag)
                    
                    # Recurse into nested chains
                    if 'chains' in device:
                        extract_from_chains(device['chains'])
        
        chains = rack_info.get('chains', [])
        extract_from_chains(chains)
        return list(device_tags)
    
    def _calculate_complexity_score(self, rack_info):
        """Calculate a complexity score based on rack structure"""
        try:
            chains = rack_info.get('chains', [])
            devices = rack_info.get('devices', [])  # Direct devices
            macro_controls = rack_info.get('macro_controls', [])
            
            # Base scoring
            chain_count = len(chains)
            device_count = self._count_all_devices(chains) + len(devices)
            macro_count = len(macro_controls)
            
            # Calculate nesting depth
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
            
            # Weighted complexity score (0-100 scale)
            complexity = min(100, (
                device_count * 2 +           # Each device adds 2 points
                chain_count * 3 +            # Each chain adds 3 points  
                macro_count * 1 +            # Each macro adds 1 point
                nesting_depth * 5            # Each nesting level adds 5 points
            ))
            
            return complexity
            
        except Exception as e:
            logger.error(f"Failed to calculate complexity score: {e}")
            return 0
    
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
    
    # User Authentication Methods
    def create_user(self, username, email, password):
        """Create a new user account"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            # Hash password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # Create user document
            user_doc = {
                'username': username.lower(),
                'email': email.lower(),
                'password_hash': password_hash,
                'created_at': datetime.utcnow(),
                'last_login': None,
                'is_active': True,
                'rack_count': 0
            }
            
            # Insert user
            result = self.users_collection.insert_one(user_doc)
            logger.info(f"Created new user: {username}")
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return None
    
    def authenticate_user(self, username, password):
        """Authenticate user and return user info if successful"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            # Find user by username or email
            user = self.users_collection.find_one({
                '$or': [
                    {'username': username.lower()},
                    {'email': username.lower()}
                ]
            })
            
            if not user:
                return None
            
            # Check password
            if bcrypt.checkpw(password.encode('utf-8'), user['password_hash']):
                # Update last login
                self.users_collection.update_one(
                    {'_id': user['_id']},
                    {'$set': {'last_login': datetime.utcnow()}}
                )
                
                # Return user info (without password)
                user['_id'] = str(user['_id'])
                del user['password_hash']
                return user
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to authenticate user: {e}")
            return None
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            user = self.users_collection.find_one({'_id': ObjectId(user_id)})
            if user:
                user['_id'] = str(user['_id'])
                del user['password_hash']
                return user
            return None
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            return None
    
    def get_user_racks(self, user_id, limit=50):
        """Get racks uploaded by a specific user"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.collection.find({'user_id': user_id}).sort('created_at', -1).limit(limit)
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to get user racks: {e}")
            return []
    
    def update_rack_ownership(self, rack_id, user_id):
        """Update rack to be owned by a user"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$set': {'user_id': user_id}}
            )
            
            # Update user's rack count
            if result.modified_count > 0:
                self.users_collection.update_one(
                    {'_id': ObjectId(user_id)},
                    {'$inc': {'rack_count': 1}}
                )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update rack ownership: {e}")
            return False
    
    def increment_download_count(self, rack_id):
        """Increment download count for a rack"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$inc': {'download_count': 1}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to increment download count: {e}")
            return False
    
    def get_most_downloaded_racks(self, limit=10):
        """Get most downloaded racks"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.collection.find().sort('download_count', -1).limit(limit)
            racks = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                racks.append(doc)
            return racks
        except Exception as e:
            logger.error(f"Failed to get most downloaded racks: {e}")
            return []
    
    def toggle_favorite(self, user_id, rack_id):
        """Toggle favorite status for a rack"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            # Check if favorite exists
            existing = self.favorites_collection.find_one({
                'user_id': user_id,
                'rack_id': rack_id
            })
            
            if existing:
                # Remove favorite
                self.favorites_collection.delete_one({
                    'user_id': user_id,
                    'rack_id': rack_id
                })
                return False  # Not favorited anymore
            else:
                # Add favorite
                self.favorites_collection.insert_one({
                    'user_id': user_id,
                    'rack_id': rack_id,
                    'created_at': datetime.utcnow()
                })
                return True  # Now favorited
                
        except Exception as e:
            logger.error(f"Failed to toggle favorite: {e}")
            return None
    
    def is_favorited(self, user_id, rack_id):
        """Check if a rack is favorited by a user"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            existing = self.favorites_collection.find_one({
                'user_id': user_id,
                'rack_id': rack_id
            })
            return existing is not None
        except Exception as e:
            logger.error(f"Failed to check favorite status: {e}")
            return False
    
    def get_user_favorites(self, user_id, limit=50):
        """Get user's favorite racks"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            # Get favorite rack IDs
            favorites = self.favorites_collection.find(
                {'user_id': user_id}
            ).sort('created_at', -1).limit(limit)
            
            rack_ids = [ObjectId(fav['rack_id']) for fav in favorites]
            
            # Get the actual racks
            if rack_ids:
                cursor = self.collection.find({'_id': {'$in': rack_ids}})
                racks = []
                for doc in cursor:
                    doc['_id'] = str(doc['_id'])
                    doc['is_favorited'] = True
                    racks.append(doc)
                return racks
            return []
            
        except Exception as e:
            logger.error(f"Failed to get user favorites: {e}")
            return []
    
    def update_rack_ai_analysis(self, rack_id, ai_analysis):
        """Update rack with AI analysis results"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'ai_analysis': ai_analysis,
                        'ai_analyzed_at': datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update AI analysis: {e}")
            return False
    
    def save_rack_type(self, rack_id, rack_type):
        """Update rack type for a rack"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$set': {'rack_type': rack_type}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to save rack type: {e}")
            return False
    
    # Enhanced Community Features
    
    def create_annotation(self, rack_id, user_id, annotation_data):
        """Create a new annotation for a rack component"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            annotation = {
                'rack_id': rack_id,
                'user_id': user_id,
                'type': annotation_data.get('type', 'general'),
                'component_id': annotation_data.get('component_id'),
                'position': annotation_data.get('position', {'x': 0, 'y': 0}),
                'content': annotation_data.get('content', ''),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            result = self.annotations_collection.insert_one(annotation)
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create annotation: {e}")
            return None
    
    def get_rack_annotations(self, rack_id):
        """Get all annotations for a rack"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.annotations_collection.find({'rack_id': rack_id}).sort('created_at', 1)
            annotations = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                annotations.append(doc)
            return annotations
        except Exception as e:
            logger.error(f"Failed to get rack annotations: {e}")
            return []
    
    def update_annotation(self, annotation_id, user_id, content):
        """Update an annotation (only by owner)"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.annotations_collection.update_one(
                {'_id': ObjectId(annotation_id), 'user_id': user_id},
                {
                    '$set': {
                        'content': content,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update annotation: {e}")
            return False
    
    def delete_annotation(self, annotation_id, user_id):
        """Delete an annotation (only by owner)"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.annotations_collection.delete_one({
                '_id': ObjectId(annotation_id),
                'user_id': user_id
            })
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete annotation: {e}")
            return False
    
    def create_comment(self, rack_id, user_id, content, parent_comment_id=None):
        """Create a new comment on a rack"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            comment = {
                'rack_id': rack_id,
                'user_id': user_id,
                'content': content,
                'parent_comment_id': parent_comment_id,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'likes': 0,
                'is_deleted': False
            }
            
            result = self.comments_collection.insert_one(comment)
            
            # Increment comment count on rack
            self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$inc': {'engagement.comment_count': 1}}
            )
            
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create comment: {e}")
            return None
    
    def get_rack_comments(self, rack_id, limit=50):
        """Get comments for a rack with user info"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            # Aggregate to join with user data
            pipeline = [
                {'$match': {'rack_id': rack_id, 'is_deleted': False}},
                {'$sort': {'created_at': -1}},
                {'$limit': limit},
                {
                    '$lookup': {
                        'from': 'users',
                        'localField': 'user_id',
                        'foreignField': '_id',
                        'as': 'user'
                    }
                },
                {
                    '$project': {
                        'content': 1,
                        'parent_comment_id': 1,
                        'created_at': 1,
                        'updated_at': 1,
                        'likes': 1,
                        'user.username': 1,
                        'user._id': 1
                    }
                }
            ]
            
            result = list(self.comments_collection.aggregate(pipeline))
            for comment in result:
                comment['_id'] = str(comment['_id'])
                if comment.get('user'):
                    comment['user'][0]['_id'] = str(comment['user'][0]['_id'])
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get rack comments: {e}")
            return []
    
    def rate_rack(self, rack_id, user_id, rating, review=None):
        """Rate a rack (1-5 stars)"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            # Upsert rating
            rating_doc = {
                'rack_id': rack_id,
                'user_id': user_id,
                'rating': rating,
                'review': review,
                'created_at': datetime.utcnow()
            }
            
            # Check if rating exists
            existing = self.ratings_collection.find_one({
                'rack_id': rack_id,
                'user_id': user_id
            })
            
            if existing:
                # Update existing rating
                self.ratings_collection.update_one(
                    {'_id': existing['_id']},
                    {'$set': rating_doc}
                )
            else:
                # Insert new rating
                self.ratings_collection.insert_one(rating_doc)
            
            # Recalculate average rating for rack
            self._update_rack_rating(rack_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to rate rack: {e}")
            return False
    
    def _update_rack_rating(self, rack_id):
        """Recalculate and update rack's average rating"""
        try:
            # Get all ratings for this rack
            ratings = list(self.ratings_collection.find({'rack_id': rack_id}))
            
            if not ratings:
                return
            
            # Calculate statistics
            total_ratings = len(ratings)
            sum_ratings = sum(r['rating'] for r in ratings)
            average = round(sum_ratings / total_ratings, 2)
            
            # Distribution
            distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            for rating in ratings:
                distribution[str(rating['rating'])] += 1
            
            # Update rack document
            self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'engagement.rating.average': average,
                        'engagement.rating.count': total_ratings,
                        'engagement.rating.distribution': distribution
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to update rack rating: {e}")
    
    def create_collection(self, user_id, name, description='', is_public=True):
        """Create a new rack collection"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            collection_doc = {
                'user_id': user_id,
                'name': name,
                'description': description,
                'rack_ids': [],
                'is_public': is_public,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            result = self.collections_collection.insert_one(collection_doc)
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            return None
    
    def add_rack_to_collection(self, collection_id, user_id, rack_id):
        """Add a rack to a user's collection"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collections_collection.update_one(
                {'_id': ObjectId(collection_id), 'user_id': user_id},
                {
                    '$addToSet': {'rack_ids': rack_id},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to add rack to collection: {e}")
            return False
    
    def get_user_collections(self, user_id):
        """Get all collections for a user"""
        if not self.connected:
            if not self.connect():
                return []
        
        try:
            cursor = self.collections_collection.find({'user_id': user_id}).sort('updated_at', -1)
            collections = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                collections.append(doc)
            return collections
        except Exception as e:
            logger.error(f"Failed to get user collections: {e}")
            return []
    
    def increment_view_count(self, rack_id):
        """Increment view count for a rack"""
        if not self.connected:
            if not self.connect():
                return False
        
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$inc': {'engagement.view_count': 1}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to increment view count: {e}")
            return False

# Create a global instance
db = MongoDB()
