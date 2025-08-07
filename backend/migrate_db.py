"""
Migration script to move from relational-style collections to document-based design
This will merge annotations, comments, and ratings into rack documents
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import db as old_db  # Old database
from db_new import db_new  # New database
import logging
from datetime import datetime
from bson import ObjectId

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseMigration:
    def __init__(self):
        self.old_db = old_db
        self.new_db = db_new
        
    def migrate_all(self):
        """Run complete migration"""
        logger.info("Starting database migration...")
        
        # Connect to both databases
        if not self.old_db.connect():
            logger.error("Failed to connect to old database")
            return False
            
        if not self.new_db.connect():
            logger.error("Failed to connect to new database")
            return False
        
        # Migrate in order
        self.migrate_users()
        self.migrate_racks()
        self.migrate_favorites()
        self.migrate_annotations()
        self.migrate_comments()
        self.migrate_ratings()
        
        logger.info("Migration completed!")
        return True
    
    def migrate_users(self):
        """Migrate users to new schema with embedded collections"""
        logger.info("Migrating users...")
        
        try:
            # Get all users from old schema
            old_users = list(self.old_db.users_collection.find())
            
            for old_user in old_users:
                # Get user's collections from old schema
                old_collections = list(self.old_db.collections_collection.find({
                    'user_id': str(old_user['_id'])
                }))
                
                # Transform collections to new embedded format
                new_collections = []
                for coll in old_collections:
                    new_collections.append({
                        'id': str(coll['_id']),
                        'name': coll['name'],
                        'description': coll.get('description', ''),
                        'rack_ids': coll.get('rack_ids', []),
                        'is_public': coll.get('is_public', True),
                        'created_at': coll.get('created_at', datetime.utcnow()),
                        'updated_at': coll.get('updated_at', datetime.utcnow())
                    })
                
                # Create new user document
                new_user = {
                    '_id': old_user['_id'],
                    'username': old_user['username'],
                    'email': old_user['email'],
                    'password_hash': old_user['password_hash'],
                    'created_at': old_user.get('created_at', datetime.utcnow()),
                    'last_login': old_user.get('last_login'),
                    
                    'profile': {
                        'display_name': old_user.get('username', ''),
                        'bio': '',
                        'location': '',
                        'website': '',
                        'avatar_url': None
                    },
                    
                    'collections': new_collections,
                    
                    'favorites': {
                        'rack_ids': [],  # Will be populated later
                        'last_updated': datetime.utcnow()
                    },
                    
                    'stats': {
                        'uploads_count': old_user.get('rack_count', 0),
                        'total_downloads': 0,  # Will be calculated
                        'total_favorites_received': 0,  # Will be calculated
                        'average_rating': 0.0  # Will be calculated
                    }
                }
                
                # Insert into new collection
                self.new_db.users_collection.replace_one(
                    {'_id': old_user['_id']},
                    new_user,
                    upsert=True
                )
                
            logger.info(f"Migrated {len(old_users)} users")
            
        except Exception as e:
            logger.error(f"Failed to migrate users: {e}")
    
    def migrate_racks(self):
        """Migrate racks to new schema"""
        logger.info("Migrating racks...")
        
        try:
            old_racks = list(self.old_db.collection.find())
            
            for old_rack in old_racks:
                # Extract metadata from old format
                user_info = old_rack.get('user_info', {})
                metadata = old_rack.get('metadata', {})
                
                new_rack = {
                    '_id': old_rack['_id'],
                    'filename': old_rack.get('filename', ''),
                    'rack_name': old_rack.get('rack_name', 'Unknown'),
                    'rack_type': old_rack.get('rack_type', 'Unknown'),
                    'created_at': old_rack.get('created_at', datetime.utcnow()),
                    'updated_at': datetime.utcnow(),
                    
                    'user_id': old_rack.get('user_id'),
                    'producer_name': old_rack.get('producer_name', user_info.get('producer_name', '')),
                    
                    'analysis': old_rack.get('analysis', {}),
                    
                    'metadata': {
                        'title': metadata.get('title', old_rack.get('rack_name', 'Unknown')),
                        'description': metadata.get('description', old_rack.get('description', user_info.get('description', ''))),
                        'difficulty': metadata.get('difficulty'),
                        'version': metadata.get('version', '1.0'),
                        'tags': self._extract_tags(old_rack),
                        'genre_tags': metadata.get('genre_tags', [])
                    },
                    
                    'engagement': {
                        'view_count': old_rack.get('engagement', {}).get('view_count', 0),
                        'download_count': old_rack.get('download_count', 0),
                        'favorite_count': 0,  # Will be calculated from favorites
                        'ratings': {
                            'average': 0.0,
                            'count': 0,
                            'distribution': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0},
                            'user_ratings': []  # Will be populated from ratings collection
                        }
                    },
                    
                    'comments': [],  # Will be populated from comments collection
                    'annotations': [],  # Will be populated from annotations collection
                    
                    'stats': old_rack.get('stats', {}),
                    'files': old_rack.get('files', {})
                }
                
                # Insert into new collection
                self.new_db.racks_collection.replace_one(
                    {'_id': old_rack['_id']},
                    new_rack,
                    upsert=True
                )
            
            logger.info(f"Migrated {len(old_racks)} racks")
            
        except Exception as e:
            logger.error(f"Failed to migrate racks: {e}")
    
    def migrate_favorites(self):
        """Migrate favorites into user documents"""
        logger.info("Migrating favorites...")
        
        try:
            # Group favorites by user
            favorites_by_user = {}
            old_favorites = list(self.old_db.favorites_collection.find())
            
            for fav in old_favorites:
                user_id = fav['user_id']
                if user_id not in favorites_by_user:
                    favorites_by_user[user_id] = []
                favorites_by_user[user_id].append(fav['rack_id'])
            
            # Update user documents with favorites
            for user_id, rack_ids in favorites_by_user.items():
                self.new_db.users_collection.update_one(
                    {'_id': user_id if isinstance(user_id, ObjectId) else ObjectId(user_id)},
                    {
                        '$set': {
                            'favorites.rack_ids': rack_ids,
                            'favorites.last_updated': datetime.utcnow()
                        }
                    }
                )
                
                # Update favorite counts on racks
                for rack_id in rack_ids:
                    self.new_db.racks_collection.update_one(
                        {'_id': ObjectId(rack_id)},
                        {'$inc': {'engagement.favorite_count': 1}}
                    )
            
            logger.info(f"Migrated favorites for {len(favorites_by_user)} users")
            
        except Exception as e:
            logger.error(f"Failed to migrate favorites: {e}")
    
    def migrate_annotations(self):
        """Migrate annotations into rack documents"""
        logger.info("Migrating annotations...")
        
        try:
            old_annotations = list(self.old_db.annotations_collection.find())
            
            # Group annotations by rack
            annotations_by_rack = {}
            for ann in old_annotations:
                rack_id = ann['rack_id']
                if rack_id not in annotations_by_rack:
                    annotations_by_rack[rack_id] = []
                
                # Get username for denormalization
                user = self.old_db.users_collection.find_one({'_id': ObjectId(ann['user_id'])})
                username = user['username'] if user else 'Unknown'
                
                annotations_by_rack[rack_id].append({
                    'id': str(ann['_id']),
                    'user_id': ann['user_id'],
                    'username': username,
                    'type': ann.get('type', 'general'),
                    'component_id': ann.get('component_id'),
                    'position': ann.get('position', {'x': 0, 'y': 0}),
                    'content': ann.get('content', ''),
                    'created_at': ann.get('created_at', datetime.utcnow())
                })
            
            # Update rack documents with annotations
            for rack_id, annotations in annotations_by_rack.items():
                self.new_db.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$set': {'annotations': annotations}}
                )
            
            logger.info(f"Migrated annotations for {len(annotations_by_rack)} racks")
            
        except Exception as e:
            logger.error(f"Failed to migrate annotations: {e}")
    
    def migrate_comments(self):
        """Migrate comments into rack documents"""
        logger.info("Migrating comments...")
        
        try:
            old_comments = list(self.old_db.comments_collection.find())
            
            # Group comments by rack
            comments_by_rack = {}
            for comment in old_comments:
                rack_id = comment['rack_id']
                if rack_id not in comments_by_rack:
                    comments_by_rack[rack_id] = []
                
                # Get username
                user = self.old_db.users_collection.find_one({'_id': ObjectId(comment['user_id'])})
                username = user['username'] if user else 'Unknown'
                
                comments_by_rack[rack_id].append({
                    'id': str(comment['_id']),
                    'user_id': comment['user_id'],
                    'username': username,
                    'content': comment.get('content', ''),
                    'created_at': comment.get('created_at', datetime.utcnow()),
                    'likes': comment.get('likes', 0),
                    'replies': []  # Handle replies separately if needed
                })
            
            # Update rack documents with comments
            for rack_id, comments in comments_by_rack.items():
                self.new_db.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$set': {'comments': comments}}
                )
            
            logger.info(f"Migrated comments for {len(comments_by_rack)} racks")
            
        except Exception as e:
            logger.error(f"Failed to migrate comments: {e}")
    
    def migrate_ratings(self):
        """Migrate ratings into rack documents"""
        logger.info("Migrating ratings...")
        
        try:
            old_ratings = list(self.old_db.ratings_collection.find())
            
            # Group ratings by rack
            ratings_by_rack = {}
            for rating in old_ratings:
                rack_id = rating['rack_id']
                if rack_id not in ratings_by_rack:
                    ratings_by_rack[rack_id] = []
                
                # Get username
                user = self.old_db.users_collection.find_one({'_id': ObjectId(rating['user_id'])})
                username = user['username'] if user else 'Unknown'
                
                ratings_by_rack[rack_id].append({
                    'user_id': rating['user_id'],
                    'username': username,
                    'rating': rating['rating'],
                    'review': rating.get('review'),
                    'created_at': rating.get('created_at', datetime.utcnow())
                })
            
            # Update rack documents with ratings and calculate averages
            for rack_id, user_ratings in ratings_by_rack.items():
                # Calculate aggregate stats
                total = len(user_ratings)
                average = sum(r['rating'] for r in user_ratings) / total
                
                distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
                for rating in user_ratings:
                    distribution[str(rating['rating'])] += 1
                
                self.new_db.racks_collection.update_one(
                    {'_id': ObjectId(rack_id)},
                    {'$set': {
                        'engagement.ratings': {
                            'average': round(average, 2),
                            'count': total,
                            'distribution': distribution,
                            'user_ratings': user_ratings
                        }
                    }}
                )
            
            logger.info(f"Migrated ratings for {len(ratings_by_rack)} racks")
            
        except Exception as e:
            logger.error(f"Failed to migrate ratings: {e}")
    
    def _extract_tags(self, old_rack):
        """Extract tags from various places in old rack"""
        tags = []
        
        # From user_info
        user_info = old_rack.get('user_info', {})
        if 'tags' in user_info:
            if isinstance(user_info['tags'], list):
                tags.extend(user_info['tags'])
            else:
                tags.append(user_info['tags'])
        
        # From top-level tags
        if 'tags' in old_rack:
            if isinstance(old_rack['tags'], list):
                tags.extend(old_rack['tags'])
            else:
                tags.append(old_rack['tags'])
        
        # From metadata
        metadata = old_rack.get('metadata', {})
        if 'tags' in metadata:
            tags.extend(metadata['tags'])
        
        return list(set(tags))  # Remove duplicates

if __name__ == "__main__":
    migration = DatabaseMigration()
    migration.migrate_all()
