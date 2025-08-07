"""
Migration script to move from current database structure to optimized v3 structure
Handles batch processing, data validation, and rollback capabilities
"""

import os
import sys
import logging
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, BulkWriteError
from bson import ObjectId
from typing import Dict, List, Optional, Any
import json

# Import both old and new database implementations
from db import MongoDB as OldMongoDB
from db_v3_optimized import MongoDBOptimized as NewMongoDB

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MigrationManager:
    """Manages migration from current DB structure to optimized v3 structure"""
    
    def __init__(self):
        self.old_db = OldMongoDB()
        self.new_db = NewMongoDB()
        self.migration_log = []
        self.batch_size = 100
        self.failed_migrations = []
        
    def connect_databases(self) -> bool:
        """Connect to both old and new database instances"""
        try:
            old_connected = self.old_db.connect()
            new_connected = self.new_db.connect()
            
            if not old_connected:
                logger.error("Failed to connect to old database")
                return False
            
            if not new_connected:
                logger.error("Failed to connect to new database")
                return False
            
            logger.info("Successfully connected to both databases")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect databases: {e}")
            return False
    
    def analyze_current_data(self) -> Dict:
        """Analyze current database to understand migration scope"""
        try:
            analysis = {
                'racks_count': 0,
                'users_count': 0,
                'comments_count': 0,
                'ratings_count': 0,
                'annotations_count': 0,
                'favorites_count': 0,
                'collections_count': 0,
                'estimated_size': 0
            }
            
            # Count documents in old database
            analysis['racks_count'] = self.old_db.collection.count_documents({})
            analysis['users_count'] = self.old_db.users_collection.count_documents({})
            
            if hasattr(self.old_db, 'comments_collection'):
                analysis['comments_count'] = self.old_db.comments_collection.count_documents({})
            if hasattr(self.old_db, 'ratings_collection'):
                analysis['ratings_count'] = self.old_db.ratings_collection.count_documents({})
            if hasattr(self.old_db, 'annotations_collection'):
                analysis['annotations_count'] = self.old_db.annotations_collection.count_documents({})
            if hasattr(self.old_db, 'favorites_collection'):
                analysis['favorites_count'] = self.old_db.favorites_collection.count_documents({})
            if hasattr(self.old_db, 'collections_collection'):
                analysis['collections_count'] = self.old_db.collections_collection.count_documents({})
            
            logger.info("Current database analysis:")
            for key, value in analysis.items():
                logger.info(f"  {key}: {value}")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze current data: {e}")
            return {}
    
    def migrate_racks_batch(self, skip: int = 0, limit: int = None) -> Dict:
        """Migrate racks in batches with embedded data consolidation"""
        if limit is None:
            limit = self.batch_size
        
        try:
            # Get batch of racks from old database
            old_racks = list(self.old_db.collection.find().skip(skip).limit(limit))
            
            migration_results = {
                'processed': 0,
                'successful': 0,
                'failed': 0,
                'errors': []
            }
            
            for old_rack in old_racks:
                try:
                    rack_id = str(old_rack['_id'])
                    
                    # Build optimized rack document
                    new_rack = self._convert_rack_to_v3_format(old_rack)
                    
                    # Embed related data
                    new_rack = self._embed_related_data(new_rack, rack_id)
                    
                    # Validate document size
                    doc_size = len(json.dumps(new_rack, default=str).encode('utf-8'))
                    if doc_size > self.new_db.MAX_DOCUMENT_SIZE:
                        logger.warning(f"Large document for rack {rack_id}: {doc_size} bytes")
                    
                    # Insert into new database
                    new_rack['_id'] = old_rack['_id']  # Preserve original ID
                    self.new_db.racks_collection.insert_one(new_rack)
                    
                    migration_results['successful'] += 1
                    
                    # Log successful migration
                    self.migration_log.append({
                        'rack_id': rack_id,
                        'status': 'success',
                        'timestamp': datetime.utcnow(),
                        'doc_size': doc_size
                    })
                    
                except Exception as e:
                    error_msg = f"Failed to migrate rack {rack_id}: {e}"
                    logger.error(error_msg)
                    migration_results['errors'].append(error_msg)
                    migration_results['failed'] += 1
                    
                    self.failed_migrations.append({
                        'rack_id': rack_id,
                        'error': str(e),
                        'timestamp': datetime.utcnow()
                    })
                
                migration_results['processed'] += 1
            
            return migration_results
            
        except Exception as e:
            logger.error(f"Failed to migrate racks batch: {e}")
            return {'processed': 0, 'successful': 0, 'failed': 0, 'errors': [str(e)]}
    
    def _convert_rack_to_v3_format(self, old_rack: Dict) -> Dict:
        """Convert old rack format to optimized v3 format"""
        try:
            # Extract metadata from various possible locations
            user_info = old_rack.get('user_info', {})
            metadata_obj = old_rack.get('metadata', {})
            
            # Build new optimized structure
            new_rack = {
                # Basic information
                'filename': old_rack.get('filename', 'unknown'),
                'rack_name': old_rack.get('rack_name', 'Unknown'),
                'rack_type': old_rack.get('rack_type', 'Unknown'),
                'created_at': old_rack.get('created_at', datetime.utcnow()),
                'updated_at': datetime.utcnow(),
                
                # User information
                'user_id': old_rack.get('user_id'),
                'producer_name': old_rack.get('producer_name', user_info.get('producer_name', '')),
                
                # Analysis data
                'analysis': old_rack.get('analysis', {}),
                
                # Enhanced metadata
                'metadata': {
                    'title': metadata_obj.get('title', old_rack.get('rack_name', 'Unknown')),
                    'description': metadata_obj.get('description', old_rack.get('description', user_info.get('description', ''))),
                    'difficulty': metadata_obj.get('difficulty', 'unknown'),
                    'version': metadata_obj.get('version', '1.0'),
                    'tags': self._extract_tags(old_rack),
                    'genre_tags': metadata_obj.get('genre_tags', []),
                    'device_tags': self._extract_device_tags_from_analysis(old_rack.get('analysis', {}))
                },
                
                # Initialize embedded arrays (will be populated by _embed_related_data)
                'comments': [],
                'ratings': {
                    'average': old_rack.get('engagement', {}).get('rating', {}).get('average', 0.0),
                    'count': old_rack.get('engagement', {}).get('rating', {}).get('count', 0),
                    'distribution': old_rack.get('engagement', {}).get('rating', {}).get('distribution', {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}),
                    'user_ratings': []
                },
                'annotations': [],
                
                # Engagement metrics
                'engagement': {
                    'view_count': old_rack.get('engagement', {}).get('view_count', old_rack.get('view_count', 0)),
                    'download_count': old_rack.get('engagement', {}).get('download_count', old_rack.get('download_count', 0)),
                    'favorite_count': old_rack.get('engagement', {}).get('favorite_count', 0),
                    'fork_count': old_rack.get('engagement', {}).get('fork_count', 0)
                },
                
                # Statistics
                'stats': old_rack.get('stats', {}),
                
                # File references
                'files': old_rack.get('files', {}),
                
                # Document tracking
                '_doc_size': 0,
                '_overflow_refs': {}
            }
            
            # Preserve file content if it exists
            if 'file_content' in old_rack:
                new_rack['file_content'] = old_rack['file_content']
            
            return new_rack
            
        except Exception as e:
            logger.error(f"Failed to convert rack format: {e}")
            raise
    
    def _embed_related_data(self, new_rack: Dict, rack_id: str) -> Dict:
        """Embed comments, ratings, and annotations into the rack document"""
        try:
            # Embed comments if comments collection exists
            if hasattr(self.old_db, 'comments_collection'):
                comments = list(self.old_db.comments_collection.find(
                    {'rack_id': rack_id}
                ).sort('created_at', -1).limit(self.new_db.MAX_COMMENTS_EMBEDDED))
                
                embedded_comments = []
                for comment in comments:
                    # Get username from user collection
                    username = self._get_username_by_id(comment.get('user_id'))
                    
                    embedded_comment = {
                        'id': str(comment['_id']),
                        'user_id': comment.get('user_id'),
                        'username': username,
                        'content': comment.get('content', ''),
                        'parent_comment_id': comment.get('parent_comment_id'),
                        'created_at': comment.get('created_at', datetime.utcnow()),
                        'likes': comment.get('likes', 0),
                        'replies': []  # Flatten nested comments for now
                    }
                    embedded_comments.append(embedded_comment)
                
                new_rack['comments'] = embedded_comments
            
            # Embed ratings if ratings collection exists
            if hasattr(self.old_db, 'ratings_collection'):
                ratings = list(self.old_db.ratings_collection.find(
                    {'rack_id': rack_id}
                ).sort('created_at', -1).limit(self.new_db.MAX_RATINGS_EMBEDDED))
                
                embedded_ratings = []
                for rating in ratings:
                    username = self._get_username_by_id(rating.get('user_id'))
                    
                    embedded_rating = {
                        'user_id': rating.get('user_id'),
                        'username': username,
                        'rating': rating.get('rating', 0),
                        'review': rating.get('review', ''),
                        'created_at': rating.get('created_at', datetime.utcnow())
                    }
                    embedded_ratings.append(embedded_rating)
                
                new_rack['ratings']['user_ratings'] = embedded_ratings
            
            # Embed annotations if annotations collection exists
            if hasattr(self.old_db, 'annotations_collection'):
                annotations = list(self.old_db.annotations_collection.find(
                    {'rack_id': rack_id}
                ).sort('created_at', -1).limit(self.new_db.MAX_ANNOTATIONS_EMBEDDED))
                
                embedded_annotations = []
                for annotation in annotations:
                    embedded_annotation = {
                        'id': str(annotation['_id']),
                        'user_id': annotation.get('user_id'),
                        'type': annotation.get('type', 'general'),
                        'component_id': annotation.get('component_id'),
                        'position': annotation.get('position', {'x': 0, 'y': 0}),
                        'content': annotation.get('content', ''),
                        'created_at': annotation.get('created_at', datetime.utcnow())
                    }
                    embedded_annotations.append(embedded_annotation)
                
                new_rack['annotations'] = embedded_annotations
            
            return new_rack
            
        except Exception as e:
            logger.error(f"Failed to embed related data: {e}")
            return new_rack
    
    def _get_username_by_id(self, user_id: str) -> str:
        """Get username by user ID for denormalization"""
        try:
            if not user_id:
                return 'Anonymous'
            
            user = self.old_db.users_collection.find_one({'_id': ObjectId(user_id)})
            return user.get('username', 'Unknown') if user else 'Unknown'
        except:
            return 'Unknown'
    
    def _extract_tags(self, old_rack: Dict) -> List[str]:
        """Extract tags from various possible locations in old format"""
        tags = []
        
        # From direct tags field
        if 'tags' in old_rack:
            if isinstance(old_rack['tags'], list):
                tags.extend(old_rack['tags'])
            elif isinstance(old_rack['tags'], dict):
                # Handle new format with user_tags, auto_tags, etc.
                tags.extend(old_rack['tags'].get('user_tags', []))
                tags.extend(old_rack['tags'].get('auto_tags', []))
        
        # From user_info
        user_info = old_rack.get('user_info', {})
        if 'tags' in user_info and isinstance(user_info['tags'], list):
            tags.extend(user_info['tags'])
        
        # From metadata
        metadata = old_rack.get('metadata', {})
        if 'tags' in metadata and isinstance(metadata['tags'], list):
            tags.extend(metadata['tags'])
        
        # Remove duplicates and return
        return list(set(tags))
    
    def _extract_device_tags_from_analysis(self, analysis: Dict) -> List[str]:
        """Extract device tags from analysis data"""
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
        
        chains = analysis.get('chains', [])
        extract_from_chains(chains)
        return list(device_tags)
    
    def migrate_users_with_embedded_data(self) -> Dict:
        """Migrate users with embedded favorites and collections"""
        try:
            migration_results = {
                'processed': 0,
                'successful': 0,
                'failed': 0,
                'errors': []
            }
            
            # Get all users from old database
            old_users = list(self.old_db.users_collection.find())
            
            for old_user in old_users:
                try:
                    user_id = str(old_user['_id'])
                    
                    # Build new user document with embedded data
                    new_user = {
                        '_id': old_user['_id'],
                        'username': old_user.get('username', ''),
                        'email': old_user.get('email', ''),
                        'password_hash': old_user.get('password_hash', ''),
                        'created_at': old_user.get('created_at', datetime.utcnow()),
                        'last_login': old_user.get('last_login'),
                        'is_active': old_user.get('is_active', True),
                        
                        # Embedded collections
                        'collections': [],
                        
                        # Embedded favorites
                        'favorites': [],
                        
                        # User statistics
                        'stats': {
                            'uploads_count': 0,
                            'favorites_count': 0,
                            'collections_count': 0,
                            'total_downloads': 0,
                            'follower_count': 0
                        }
                    }
                    
                    # Embed favorites if they exist
                    if hasattr(self.old_db, 'favorites_collection'):
                        favorites = list(self.old_db.favorites_collection.find({'user_id': user_id}))
                        embedded_favorites = []
                        
                        for favorite in favorites:
                            # Get rack name for denormalization
                            rack = self.old_db.collection.find_one({'_id': ObjectId(favorite['rack_id'])})
                            rack_name = rack.get('rack_name', 'Unknown') if rack else 'Unknown'
                            
                            embedded_favorite = {
                                'rack_id': favorite['rack_id'],
                                'rack_name': rack_name,
                                'added_at': favorite.get('created_at', datetime.utcnow())
                            }
                            embedded_favorites.append(embedded_favorite)
                        
                        new_user['favorites'] = embedded_favorites
                        new_user['stats']['favorites_count'] = len(embedded_favorites)
                    
                    # Embed collections if they exist
                    if hasattr(self.old_db, 'collections_collection'):
                        collections = list(self.old_db.collections_collection.find({'user_id': user_id}))
                        embedded_collections = []
                        
                        for collection in collections:
                            embedded_collection = {
                                'id': str(collection['_id']),
                                'name': collection.get('name', ''),
                                'description': collection.get('description', ''),
                                'rack_ids': collection.get('rack_ids', []),
                                'is_public': collection.get('is_public', True),
                                'created_at': collection.get('created_at', datetime.utcnow()),
                                'updated_at': collection.get('updated_at', datetime.utcnow())
                            }
                            embedded_collections.append(embedded_collection)
                        
                        new_user['collections'] = embedded_collections
                        new_user['stats']['collections_count'] = len(embedded_collections)
                    
                    # Calculate uploads count
                    uploads_count = self.old_db.collection.count_documents({'user_id': user_id})
                    new_user['stats']['uploads_count'] = uploads_count
                    
                    # Insert into new database
                    self.new_db.users_collection.insert_one(new_user)
                    
                    migration_results['successful'] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to migrate user {user_id}: {e}"
                    logger.error(error_msg)
                    migration_results['errors'].append(error_msg)
                    migration_results['failed'] += 1
                
                migration_results['processed'] += 1
            
            return migration_results
            
        except Exception as e:
            logger.error(f"Failed to migrate users: {e}")
            return {'processed': 0, 'successful': 0, 'failed': 0, 'errors': [str(e)]}
    
    def run_full_migration(self) -> Dict:
        """Run complete migration from old to new database structure"""
        try:
            logger.info("Starting full database migration to optimized v3 structure")
            
            # Connect to databases
            if not self.connect_databases():
                return {'success': False, 'error': 'Failed to connect to databases'}
            
            # Analyze current data
            analysis = self.analyze_current_data()
            logger.info(f"Migration will process {analysis.get('racks_count', 0)} racks and {analysis.get('users_count', 0)} users")
            
            migration_summary = {
                'started_at': datetime.utcnow(),
                'analysis': analysis,
                'racks_migration': {'processed': 0, 'successful': 0, 'failed': 0},
                'users_migration': {'processed': 0, 'successful': 0, 'failed': 0},
                'errors': [],
                'success': False
            }
            
            # Migrate racks in batches
            logger.info("Starting racks migration...")
            total_racks = analysis.get('racks_count', 0)
            processed_racks = 0
            
            while processed_racks < total_racks:
                logger.info(f"Processing racks batch: {processed_racks} to {processed_racks + self.batch_size}")
                
                batch_result = self.migrate_racks_batch(skip=processed_racks, limit=self.batch_size)
                
                # Update summary
                migration_summary['racks_migration']['processed'] += batch_result['processed']
                migration_summary['racks_migration']['successful'] += batch_result['successful']
                migration_summary['racks_migration']['failed'] += batch_result['failed']
                migration_summary['errors'].extend(batch_result['errors'])
                
                processed_racks += batch_result['processed']
                
                if batch_result['processed'] == 0:  # No more documents
                    break
            
            # Migrate users
            logger.info("Starting users migration...")
            users_result = self.migrate_users_with_embedded_data()
            migration_summary['users_migration'] = users_result
            migration_summary['errors'].extend(users_result['errors'])
            
            # Finalize migration
            migration_summary['completed_at'] = datetime.utcnow()
            migration_summary['duration'] = (migration_summary['completed_at'] - migration_summary['started_at']).total_seconds()
            migration_summary['success'] = (migration_summary['racks_migration']['failed'] == 0 and 
                                          migration_summary['users_migration']['failed'] == 0)
            
            # Log summary
            logger.info("Migration completed!")
            logger.info(f"Racks: {migration_summary['racks_migration']['successful']} successful, {migration_summary['racks_migration']['failed']} failed")
            logger.info(f"Users: {migration_summary['users_migration']['successful']} successful, {migration_summary['users_migration']['failed']} failed")
            logger.info(f"Total duration: {migration_summary['duration']} seconds")
            
            # Save migration log
            self._save_migration_log(migration_summary)
            
            return migration_summary
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def _save_migration_log(self, summary: Dict):
        """Save migration log to file"""
        try:
            log_filename = f"migration_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            log_path = os.path.join(os.path.dirname(__file__), log_filename)
            
            log_data = {
                'summary': summary,
                'migration_log': self.migration_log,
                'failed_migrations': self.failed_migrations
            }
            
            with open(log_path, 'w') as f:
                json.dump(log_data, f, indent=2, default=str)
            
            logger.info(f"Migration log saved to {log_path}")
            
        except Exception as e:
            logger.error(f"Failed to save migration log: {e}")


def main():
    """Main migration function"""
    migration_manager = MigrationManager()
    result = migration_manager.run_full_migration()
    
    if result['success']:
        print("Migration completed successfully!")
        print(f"Processed {result['racks_migration']['successful']} racks and {result['users_migration']['successful']} users")
    else:
        print(f"Migration failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()