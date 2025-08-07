"""
Redesigned MongoDB schema - Document-based approach
This is how the database SHOULD be structured for MongoDB
"""

# RACK DOCUMENT STRUCTURE
rack_document_example = {
    "_id": "ObjectId('...')",
    
    # Basic rack information
    "filename": "my_flanger_rack.adg",
    "rack_name": "Crazy Flanger",
    "rack_type": "Audio Effect",
    "created_at": "2025-08-07T...",
    "updated_at": "2025-08-07T...",
    
    # User/Producer information
    "user_id": "ObjectId('...') or null",  # null for anonymous uploads
    "producer_name": "bass_daddy",  # Always present, even for anonymous
    
    # Core analysis data
    "analysis": {
        "chains": [...],
        "macro_controls": [...],
        "devices": [...]
    },
    
    # Metadata
    "metadata": {
        "title": "Crazy Flanger v2",
        "description": "A crazy ass flanger module with 3 chains...",
        "difficulty": "intermediate",
        "version": "2.0",
        "tags": ["flanger", "audio-effect", "experimental"],
        "genre_tags": ["electronic", "techno"]
    },
    
    # Engagement data (embedded for performance)
    "engagement": {
        "view_count": 157,
        "download_count": 23,
        "favorite_count": 8,  # Calculated field
        
        # Ratings embedded with aggregated stats
        "ratings": {
            "average": 4.3,
            "count": 12,
            "distribution": {"1": 0, "2": 1, "3": 2, "4": 4, "5": 5},
            "user_ratings": [
                {
                    "user_id": "ObjectId('...')",
                    "username": "producer123",  # Denormalized for performance
                    "rating": 5,
                    "review": "Amazing rack!",
                    "created_at": "2025-08-07T..."
                }
            ]
        }
    },
    
    # Comments embedded (they belong to this rack)
    "comments": [
        {
            "id": "generated_id_1",
            "user_id": "ObjectId('...')",
            "username": "commenter1",  # Denormalized
            "content": "Love this flanger effect!",
            "created_at": "2025-08-07T...",
            "likes": 3,
            "replies": [
                {
                    "id": "generated_id_2", 
                    "user_id": "ObjectId('...')",
                    "username": "producer123",
                    "content": "Thanks! Took me hours to dial in.",
                    "created_at": "2025-08-07T...",
                    "likes": 1
                }
            ]
        }
    ],
    
    # Annotations embedded (they're visual overlays on THIS rack)
    "annotations": [
        {
            "id": "generated_id_3",
            "user_id": "ObjectId('...')",
            "username": "annotator1",  # Denormalized
            "type": "tip",
            "component_id": "flanger_device_1",
            "position": {"x": 150, "y": 200},
            "content": "Try adjusting the rate for a wobbly effect",
            "created_at": "2025-08-07T..."
        }
    ],
    
    # Performance metrics
    "stats": {
        "total_chains": 3,
        "total_devices": 8,
        "macro_controls": 8,
        "complexity_score": 45,
        "cpu_usage_estimate": "medium"
    },
    
    # File references
    "files": {
        "original_file": {
            "url": "https://cdn.../rack.adg",
            "size": 1024,
            "checksum": "sha256..."
        },
        "preview_audio": "https://cdn.../preview.mp3",
        "thumbnail": "https://cdn.../thumb.png"
    }
}

# USER DOCUMENT STRUCTURE  
user_document_example = {
    "_id": "ObjectId('...')",
    
    # Basic user info
    "username": "producer123",
    "email": "producer@example.com", 
    "password_hash": "bcrypt_hash",
    "created_at": "2025-08-07T...",
    "last_login": "2025-08-07T...",
    
    # Profile information
    "profile": {
        "display_name": "Producer 123",
        "bio": "Electronic music producer...",
        "location": "Berlin, Germany",
        "website": "https://producer123.com",
        "avatar_url": "https://cdn.../avatar.jpg",
        "social_links": {
            "soundcloud": "https://soundcloud.com/producer123",
            "instagram": "@producer123"
        }
    },
    
    # User's collections/playlists (embedded - they belong to this user)
    "collections": [
        {
            "id": "collection_1",
            "name": "My Favorite Flangers",
            "description": "Collection of my go-to flanger racks",
            "rack_ids": ["ObjectId('...')", "ObjectId('...')"],
            "is_public": True,
            "created_at": "2025-08-07T...",
            "updated_at": "2025-08-07T..."
        }
    ],
    
    # User's favorites (embedded - simple array)
    "favorites": {
        "rack_ids": ["ObjectId('...')", "ObjectId('...')"],
        "last_updated": "2025-08-07T..."
    },
    
    # User statistics (calculated/cached)
    "stats": {
        "uploads_count": 15,
        "total_downloads": 245,
        "total_favorites_received": 67,
        "average_rating": 4.2,
        "followers_count": 23,
        "following_count": 18
    },
    
    # User preferences
    "preferences": {
        "email_notifications": True,
        "public_profile": True,
        "show_download_stats": True
    }
}

# MIGRATION STRATEGY
migration_plan = """
1. Create new database methods for the redesigned schema
2. Migrate existing data:
   - Merge annotations into rack documents
   - Merge ratings into rack documents  
   - Merge comments into rack documents
   - Move favorites into user documents
   - Move collections into user documents
3. Update API endpoints to work with new schema
4. Update frontend to consume new data structure
5. Remove old collections after migration is complete
"""

# BENEFITS OF THIS APPROACH
benefits = """
✅ Single query to get complete rack data (no joins!)
✅ Atomic updates for related data
✅ Better performance (no $lookup aggregations)
✅ Simpler frontend data fetching
✅ Embraces MongoDB's document nature
✅ Scales better (related data stays together)
✅ Easier to reason about and debug
"""
