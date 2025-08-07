"""
MongoDB implementation with optimized document-based design and overflow management
This implements the PRD requirements with full MongoDB document embedding and overflow handling
"""

import os
import sys
import json
import logging
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DocumentTooLarge
from bson import ObjectId
import base64
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger(__name__)

class MongoDBOptimized:
    """
    Optimized MongoDB implementation leveraging document-based design
    with embedded arrays and overflow management for scalability
    """
    
    # Document size thresholds
    MAX_DOCUMENT_SIZE = 14 * 1024 * 1024  # 14MB (leaving 2MB buffer)
    MAX_COMMENTS_EMBEDDED = 50
    MAX_RATINGS_EMBEDDED = 100
    MAX_ANNOTATIONS_EMBEDDED = 200
    
    def __init__(self):
        self.client = None
        self.db = None
        self.racks_collection = None
        self.users_collection = None
        self.comments_overflow_collection = None
        self.ratings_overflow_collection = None
        self.connected = False
        
    def connect(self):
        """Connect to MongoDB with optimized collections"""
        try:
            mongo_url = os.getenv('MONGO_URL', os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
            
            if not mongo_url:
                logger.warning("No MongoDB URL found. Using local MongoDB.")
                mongo_url = 'mongodb://localhost:27017/'
            
            self.client = MongoClient(mongo_url)
            self.client.admin.command('ping')
            
            # Use optimized database
            self.db = self.client.ableton_rack_analyzer_v3
            self.racks_collection = self.db.racks
            self.users_collection = self.db.users
            self.comments_overflow_collection = self.db.racks_comments_overflow
            self.ratings_overflow_collection = self.db.racks_ratings_overflow
            
            # Create optimized indexes
            self._create_indexes()
            
            self.connected = True
            logger.info("Successfully connected to MongoDB (Optimized Schema v3)")
            return True
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            self.connected = False
            return False
    
    def _create_indexes(self):
        """Create optimized indexes for embedded document queries"""
        try:
            # Racks collection indexes
            self.racks_collection.create_index('filename')
            self.racks_collection.create_index('created_at')
            self.racks_collection.create_index('user_id')
            self.racks_collection.create_index('producer_name')
            self.racks_collection.create_index([('ratings.average', -1)])
            self.racks_collection.create_index([('engagement.download_count', -1)])
            self.racks_collection.create_index([('engagement.view_count', -1)])
            self.racks_collection.create_index('metadata.tags')
            self.racks_collection.create_index('metadata.device_tags')
            self.racks_collection.create_index('metadata.genre_tags')
            
            # Compound indexes for common queries
            self.racks_collection.create_index([('user_id', 1), ('created_at', -1)])
            self.racks_collection.create_index([('metadata.difficulty', 1), ('ratings.average', -1)])
            self.racks_collection.create_index([('rack_type', 1), ('ratings.average', -1)])
            
            # Text search index
            self.racks_collection.create_index([
                ('rack_name', 'text'),
                ('metadata.title', 'text'),
                ('metadata.description', 'text'),
                ('metadata.tags', 'text'),
                ('producer_name', 'text')
            ])
            
            # Embedded array indexes for efficient queries
            self.racks_collection.create_index('comments.user_id')
            self.racks_collection.create_index('comments.created_at')
            self.racks_collection.create_index('annotations.user_id')
            self.racks_collection.create_index('annotations.component_id')
            self.racks_collection.create_index('ratings.user_ratings.user_id')
            
            # Users collection indexes
            self.users_collection.create_index('username', unique=True)
            self.users_collection.create_index('email', unique=True)
            self.users_collection.create_index('favorites.rack_id')
            self.users_collection.create_index('collections.rack_ids')
            
            # Overflow collection indexes
            self.comments_overflow_collection.create_index('rack_id')
            self.comments_overflow_collection.create_index('created_at')
            self.ratings_overflow_collection.create_index('rack_id')
            self.ratings_overflow_collection.create_index('created_at')
            
            logger.info("Created optimized database indexes")
            
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
    
    def save_rack_analysis(self, rack_info: Dict, filename: str, 
                          file_content: bytes = None, user_id: str = None, 
                          enhanced_metadata: Dict = None) -> Optional[str]:
        """Save rack with optimized embedded document structure"""
        if not self.connected and not self.connect():
            return None
        
        try:
            # Build the optimized rack document
            document = {
                # Basic rack information
                'filename': filename,
                'rack_name': rack_info.get('rack_name', 'Unknown'),
                'rack_type': rack_info.get('rack_type', 'Unknown'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                
                # User/Producer information
                'user_id': user_id,
                'producer_name': enhanced_metadata.get('producer_name', '') if enhanced_metadata else '',
                
                # Core analysis data
                'analysis': rack_info,
                
                # Enhanced metadata
                'metadata': self._build_metadata(rack_info, enhanced_metadata),
                
                # EMBEDDED: Comments array (starts empty)
                'comments': [],
                
                # EMBEDDED: Ratings with embedded user_ratings
                'ratings': {
                    'average': 0.0,
                    'count': 0,
                    'distribution': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0},
                    'user_ratings': []  # Embedded recent ratings
                },
                
                # EMBEDDED: Annotations array (starts empty)
                'annotations': [],
                
                # Engagement metrics
                'engagement': {
                    'view_count': 0,
                    'download_count': 0,
                    'favorite_count': 0,
                    'fork_count': 0
                },
                
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
                },
                
                # Document size monitoring
                '_doc_size': 0,  # Will be calculated after insert
                '_overflow_refs': {}  # References to overflow collections if needed
            }
            
            # Store file content if provided
            if file_content:
                document['file_content'] = base64.b64encode(file_content).decode('utf-8')
            
            # Calculate initial document size
            document['_doc_size'] = self._calculate_document_size(document)
            
            # Insert into MongoDB
            result = self.racks_collection.insert_one(document)
            logger.info(f"Saved optimized rack analysis with ID: {result.inserted_id}")
            
            return str(result.inserted_id)
            
        except DocumentTooLarge:
            logger.error("Document too large even without embedded data")
            return None
        except Exception as e:
            logger.error(f"Failed to save rack analysis: {e}")
            return None
    
    def get_rack_with_full_data(self, rack_id: str) -> Optional[Dict]:
        """Get complete rack data including embedded and overflow data in optimized way"""
        if not self.connected and not self.connect():
            return None
        
        try:
            if not ObjectId.is_valid(rack_id):
                logger.error(f"Invalid ObjectId format: {rack_id}")
                return None
            
            # Single query gets all embedded data
            document = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            
            if not document:
                return None
            
            # Convert ObjectId to string
            document['_id'] = str(document['_id'])
            
            # If there are overflow references, fetch overflow data
            if document.get('_overflow_refs'):
                document = self._merge_overflow_data(document, rack_id)
            
            # Increment view count atomically
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$inc': {'engagement.view_count': 1}}
            )
            
            return document
            
        except Exception as e:
            logger.error(f"Failed to get rack: {e}")
            return None
    
    def add_comment(self, rack_id: str, user_id: str, content: str, 
                   username: str, parent_comment_id: str = None) -> bool:
        """Add comment with overflow management"""
        if not self.connected and not self.connect():
            return False
        
        try:
            comment = {
                'id': str(ObjectId()),
                'user_id': user_id,
                'username': username,
                'content': content,
                'parent_comment_id': parent_comment_id,
                'created_at': datetime.utcnow(),
                'likes': 0,
                'replies': [] if not parent_comment_id else None
            }
            
            # Check if we need overflow management
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if not rack:
                return False
            
            current_comments = len(rack.get('comments', []))
            
            if current_comments >= self.MAX_COMMENTS_EMBEDDED:
                # Move oldest comments to overflow before adding new one
                self._manage_comments_overflow(rack_id, rack.get('comments', []))
            
            # Add new comment
            if parent_comment_id:
                # Add as reply
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
            
            # Update document size tracking
            if result.modified_count > 0:
                self._update_document_size(rack_id)
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add comment: {e}")
            return False
    
    def rate_rack(self, rack_id: str, user_id: str, rating: int, 
                 username: str, review: str = None) -> bool:
        """Rate rack with embedded ratings and overflow management"""
        if not self.connected and not self.connect():
            return False
        
        try:
            if not 1 <= rating <= 5:
                return False
            
            # Remove existing rating from this user first
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {'$pull': {'ratings.user_ratings': {'user_id': user_id}}}
            )
            
            # Check if we need overflow management
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if not rack:
                return False
            
            current_ratings = len(rack.get('ratings', {}).get('user_ratings', []))
            
            if current_ratings >= self.MAX_RATINGS_EMBEDDED:
                # Move oldest ratings to overflow
                self._manage_ratings_overflow(rack_id, rack.get('ratings', {}).get('user_ratings', []))
            
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
                    '$push': {'ratings.user_ratings': rating_obj},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                # Recalculate average rating including overflow data
                self._recalculate_rating_with_overflow(rack_id)
                self._update_document_size(rack_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to rate rack: {e}")
            return False
    
    def add_annotation(self, rack_id: str, user_id: str, annotation_data: Dict) -> bool:
        """Add annotation with overflow management"""
        if not self.connected and not self.connect():
            return False
        
        try:
            annotation = {
                'id': str(ObjectId()),
                'user_id': user_id,
                'type': annotation_data.get('type', 'general'),
                'component_id': annotation_data.get('component_id'),
                'position': annotation_data.get('position', {'x': 0, 'y': 0}),
                'content': annotation_data.get('content', ''),
                'created_at': datetime.utcnow()
            }
            
            # Check annotation count for overflow
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if not rack:
                return False
            
            current_annotations = len(rack.get('annotations', []))
            
            if current_annotations >= self.MAX_ANNOTATIONS_EMBEDDED:
                # For annotations, we might want to remove oldest instead of overflow
                # since they're position-dependent and overflow might not make sense
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$pop': {'annotations': -1}}  # Remove oldest
                )
            
            # Add new annotation
            result = self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$push': {'annotations': annotation},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                self._update_document_size(rack_id)
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to add annotation: {e}")
            return False
    
    def _manage_comments_overflow(self, rack_id: str, comments: List[Dict]):
        """Move oldest comments to overflow collection"""
        try:
            if len(comments) <= self.MAX_COMMENTS_EMBEDDED:
                return
            
            # Keep newest comments, move oldest to overflow
            comments_to_keep = comments[-(self.MAX_COMMENTS_EMBEDDED//2):]
            comments_to_overflow = comments[:-(self.MAX_COMMENTS_EMBEDDED//2)]
            
            # Save to overflow collection
            overflow_doc = {
                'rack_id': rack_id,
                'comments': comments_to_overflow,
                'created_at': datetime.utcnow()
            }
            
            overflow_result = self.comments_overflow_collection.insert_one(overflow_doc)
            
            # Update main document
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'comments': comments_to_keep,
                        '_overflow_refs.comments': overflow_result.inserted_id
                    }
                }
            )
            
            logger.info(f"Moved {len(comments_to_overflow)} comments to overflow for rack {rack_id}")
            
        except Exception as e:
            logger.error(f"Failed to manage comments overflow: {e}")
    
    def _manage_ratings_overflow(self, rack_id: str, ratings: List[Dict]):
        """Move oldest ratings to overflow collection"""
        try:
            if len(ratings) <= self.MAX_RATINGS_EMBEDDED:
                return
            
            # Keep newest ratings, move oldest to overflow
            ratings_to_keep = ratings[-(self.MAX_RATINGS_EMBEDDED//2):]
            ratings_to_overflow = ratings[:-(self.MAX_RATINGS_EMBEDDED//2)]
            
            # Save to overflow collection
            overflow_doc = {
                'rack_id': rack_id,
                'user_ratings': ratings_to_overflow,
                'created_at': datetime.utcnow()
            }
            
            overflow_result = self.ratings_overflow_collection.insert_one(overflow_doc)
            
            # Update main document
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'ratings.user_ratings': ratings_to_keep,
                        '_overflow_refs.ratings': overflow_result.inserted_id
                    }
                }
            )
            
            logger.info(f"Moved {len(ratings_to_overflow)} ratings to overflow for rack {rack_id}")
            
        except Exception as e:
            logger.error(f"Failed to manage ratings overflow: {e}")
    
    def _merge_overflow_data(self, document: Dict, rack_id: str) -> Dict:
        """Merge overflow data with main document for complete view"""
        try:
            overflow_refs = document.get('_overflow_refs', {})
            
            # Merge overflow comments
            if 'comments' in overflow_refs:
                overflow_comments = self.comments_overflow_collection.find(
                    {'rack_id': rack_id}
                ).sort('created_at', 1)
                
                all_comments = []
                for overflow_doc in overflow_comments:
                    all_comments.extend(overflow_doc.get('comments', []))
                
                # Add embedded comments
                all_comments.extend(document.get('comments', []))
                document['comments'] = all_comments
            
            # Merge overflow ratings
            if 'ratings' in overflow_refs:
                overflow_ratings = self.ratings_overflow_collection.find(
                    {'rack_id': rack_id}
                ).sort('created_at', 1)
                
                all_user_ratings = []
                for overflow_doc in overflow_ratings:
                    all_user_ratings.extend(overflow_doc.get('user_ratings', []))
                
                # Add embedded ratings
                all_user_ratings.extend(document.get('ratings', {}).get('user_ratings', []))
                document['ratings']['user_ratings'] = all_user_ratings
            
            return document
            
        except Exception as e:
            logger.error(f"Failed to merge overflow data: {e}")
            return document
    
    def _recalculate_rating_with_overflow(self, rack_id: str):
        """Recalculate rating including overflow data"""
        try:
            # Get all ratings including overflow
            all_ratings = []
            
            # Get embedded ratings
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if rack:
                all_ratings.extend(rack.get('ratings', {}).get('user_ratings', []))
            
            # Get overflow ratings
            overflow_ratings = self.ratings_overflow_collection.find({'rack_id': rack_id})
            for overflow_doc in overflow_ratings:
                all_ratings.extend(overflow_doc.get('user_ratings', []))
            
            if not all_ratings:
                return
            
            # Calculate new statistics
            total_ratings = len(all_ratings)
            sum_ratings = sum(r['rating'] for r in all_ratings)
            average = round(sum_ratings / total_ratings, 2)
            
            distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            for rating_obj in all_ratings:
                distribution[str(rating_obj['rating'])] += 1
            
            # Update the rack
            self.racks_collection.update_one(
                {'_id': ObjectId(rack_id)},
                {
                    '$set': {
                        'ratings.average': average,
                        'ratings.count': total_ratings,
                        'ratings.distribution': distribution
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to recalculate rating with overflow: {e}")
    
    def _calculate_document_size(self, document: Dict) -> int:
        """Calculate approximate document size in bytes"""
        try:
            return len(json.dumps(document, default=str).encode('utf-8'))
        except:
            return 0
    
    def _update_document_size(self, rack_id: str):
        """Update document size tracking"""
        try:
            rack = self.racks_collection.find_one({'_id': ObjectId(rack_id)})
            if rack:
                doc_size = self._calculate_document_size(rack)
                self.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$set': {'_doc_size': doc_size}}
                )
                
                # Warning if approaching limit
                if doc_size > self.MAX_DOCUMENT_SIZE * 0.9:
                    logger.warning(f"Rack {rack_id} document size ({doc_size} bytes) approaching limit")
        except Exception as e:
            logger.error(f"Failed to update document size: {e}")
    
    def _build_metadata(self, rack_info: Dict, enhanced_metadata: Dict = None) -> Dict:
        """Build metadata object with device tags extraction"""
        metadata = {
            'title': rack_info.get('rack_name', 'Unknown'),
            'description': '',
            'difficulty': 'unknown',
            'version': '1.0',
            'tags': [],
            'genre_tags': [],
            'device_tags': self._extract_device_tags(rack_info)
        }
        
        if enhanced_metadata:
            metadata.update({
                'title': enhanced_metadata.get('title', metadata['title']),
                'description': enhanced_metadata.get('description', ''),
                'difficulty': enhanced_metadata.get('difficulty', 'unknown'),
                'version': enhanced_metadata.get('version', '1.0'),
                'tags': enhanced_metadata.get('tags', []),
                'genre_tags': enhanced_metadata.get('genre_tags', [])
            })
        
        return metadata
    
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

    # Additional methods for complete API compatibility
    def get_recent_racks(self, limit: int = 10) -> List[Dict]:
        """Get recent racks with optimized embedded data"""
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
        """Text search across rack content with embedded data"""
        if not self.connected and not self.connect():
            return []
        
        try:
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


# Create global instance
db_v3 = MongoDBOptimized()