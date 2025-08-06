"""
Enhanced API routes for PRD requirements:
- Annotation system
- Enhanced metadata management
- Community features (ratings, comments, collections)
- Advanced search and filtering
"""

import logging
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from db import db
from security import sanitize_input, validate_annotation_data, validate_rating, validate_metadata

logger = logging.getLogger(__name__)

# Create blueprint
enhanced_bp = Blueprint('enhanced', __name__)

def token_required(f):
    """Authentication decorator for enhanced routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer token
            except IndexError:
                pass
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            from flask import current_app
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            current_user = db.get_user_by_id(current_user_id)
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# =============================================================================
# ANNOTATION SYSTEM ROUTES
# =============================================================================

@enhanced_bp.route('/racks/<rack_id>/annotations', methods=['GET'])
def get_rack_annotations(rack_id):
    """Get all annotations for a rack"""
    try:
        annotations = db.get_rack_annotations(rack_id)
        return jsonify({
            'success': True,
            'annotations': annotations,
            'count': len(annotations)
        }), 200
    except Exception as e:
        logger.error(f"Failed to get rack annotations: {e}")
        return jsonify({'error': 'Failed to retrieve annotations'}), 500

@enhanced_bp.route('/racks/<rack_id>/annotations', methods=['POST'])
@token_required
def create_annotation(current_user, rack_id):
    """Create a new annotation for a rack component"""
    try:
        data = request.get_json()
        
        # Validate input data
        if not validate_annotation_data(data):
            return jsonify({'error': 'Invalid annotation data'}), 400
        
        # Sanitize content
        annotation_data = {
            'type': sanitize_input(data.get('type', 'general')),
            'component_id': sanitize_input(data.get('component_id', '')),
            'position': data.get('position', {'x': 0, 'y': 0}),
            'content': sanitize_input(data.get('content', ''))
        }
        
        # Validate rack exists
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        # Create annotation
        annotation_id = db.create_annotation(rack_id, current_user['_id'], annotation_data)
        
        if annotation_id:
            return jsonify({
                'success': True,
                'annotation_id': annotation_id,
                'message': 'Annotation created successfully'
            }), 201
        else:
            return jsonify({'error': 'Failed to create annotation'}), 500
            
    except Exception as e:
        logger.error(f"Failed to create annotation: {e}")
        return jsonify({'error': 'Failed to create annotation'}), 500

@enhanced_bp.route('/annotations/<annotation_id>', methods=['PUT'])
@token_required
def update_annotation(current_user, annotation_id):
    """Update an annotation (only by owner)"""
    try:
        data = request.get_json()
        content = sanitize_input(data.get('content', ''))
        
        if not content.strip():
            return jsonify({'error': 'Content cannot be empty'}), 400
        
        success = db.update_annotation(annotation_id, current_user['_id'], content)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Annotation updated successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to update annotation or unauthorized'}), 403
            
    except Exception as e:
        logger.error(f"Failed to update annotation: {e}")
        return jsonify({'error': 'Failed to update annotation'}), 500

@enhanced_bp.route('/annotations/<annotation_id>', methods=['DELETE'])
@token_required
def delete_annotation(current_user, annotation_id):
    """Delete an annotation (only by owner)"""
    try:
        success = db.delete_annotation(annotation_id, current_user['_id'])
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Annotation deleted successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to delete annotation or unauthorized'}), 403
            
    except Exception as e:
        logger.error(f"Failed to delete annotation: {e}")
        return jsonify({'error': 'Failed to delete annotation'}), 500

# =============================================================================
# RATINGS AND REVIEWS ROUTES
# =============================================================================

@enhanced_bp.route('/racks/<rack_id>/rate', methods=['POST'])
@token_required
def rate_rack(current_user, rack_id):
    """Rate a rack (1-5 stars)"""
    try:
        data = request.get_json()
        rating = data.get('rating')
        review = sanitize_input(data.get('review', '')) if data.get('review') else None
        
        # Validate rating
        if not validate_rating(rating):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Validate rack exists
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        # Check if user is not rating their own rack
        if rack.get('user_id') == current_user['_id']:
            return jsonify({'error': 'Cannot rate your own rack'}), 400
        
        success = db.rate_rack(rack_id, current_user['_id'], rating, review)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Rating submitted successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to submit rating'}), 500
            
    except Exception as e:
        logger.error(f"Failed to rate rack: {e}")
        return jsonify({'error': 'Failed to submit rating'}), 500

# =============================================================================
# COMMENTS ROUTES
# =============================================================================

@enhanced_bp.route('/racks/<rack_id>/comments', methods=['GET'])
def get_rack_comments(rack_id):
    """Get comments for a rack"""
    try:
        limit = request.args.get('limit', 50, type=int)
        comments = db.get_rack_comments(rack_id, limit)
        
        return jsonify({
            'success': True,
            'comments': comments,
            'count': len(comments)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get rack comments: {e}")
        return jsonify({'error': 'Failed to retrieve comments'}), 500

@enhanced_bp.route('/racks/<rack_id>/comments', methods=['POST'])
@token_required
def create_comment(current_user, rack_id):
    """Create a new comment on a rack"""
    try:
        data = request.get_json()
        content = sanitize_input(data.get('content', ''))
        parent_comment_id = data.get('parent_comment_id')
        
        if not content.strip():
            return jsonify({'error': 'Comment content cannot be empty'}), 400
        
        if len(content) > 1000:  # Limit comment length
            return jsonify({'error': 'Comment too long (max 1000 characters)'}), 400
        
        # Validate rack exists
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        comment_id = db.create_comment(rack_id, current_user['_id'], content, parent_comment_id)
        
        if comment_id:
            return jsonify({
                'success': True,
                'comment_id': comment_id,
                'message': 'Comment created successfully'
            }), 201
        else:
            return jsonify({'error': 'Failed to create comment'}), 500
            
    except Exception as e:
        logger.error(f"Failed to create comment: {e}")
        return jsonify({'error': 'Failed to create comment'}), 500

# =============================================================================
# COLLECTIONS ROUTES
# =============================================================================

@enhanced_bp.route('/collections', methods=['GET'])
@token_required
def get_user_collections(current_user):
    """Get all collections for a user"""
    try:
        collections = db.get_user_collections(current_user['_id'])
        return jsonify({
            'success': True,
            'collections': collections,
            'count': len(collections)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user collections: {e}")
        return jsonify({'error': 'Failed to retrieve collections'}), 500

@enhanced_bp.route('/collections', methods=['POST'])
@token_required
def create_collection(current_user):
    """Create a new rack collection"""
    try:
        data = request.get_json()
        name = sanitize_input(data.get('name', ''))
        description = sanitize_input(data.get('description', ''))
        is_public = data.get('is_public', True)
        
        if not name.strip():
            return jsonify({'error': 'Collection name is required'}), 400
        
        if len(name) > 100:
            return jsonify({'error': 'Collection name too long (max 100 characters)'}), 400
        
        collection_id = db.create_collection(current_user['_id'], name, description, is_public)
        
        if collection_id:
            return jsonify({
                'success': True,
                'collection_id': collection_id,
                'message': 'Collection created successfully'
            }), 201
        else:
            return jsonify({'error': 'Failed to create collection'}), 500
            
    except Exception as e:
        logger.error(f"Failed to create collection: {e}")
        return jsonify({'error': 'Failed to create collection'}), 500

@enhanced_bp.route('/collections/<collection_id>/racks', methods=['PUT'])
@token_required
def add_rack_to_collection(current_user, collection_id):
    """Add a rack to a collection"""
    try:
        data = request.get_json()
        rack_id = data.get('rack_id')
        
        if not rack_id:
            return jsonify({'error': 'Rack ID is required'}), 400
        
        # Validate rack exists
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        success = db.add_rack_to_collection(collection_id, current_user['_id'], rack_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Rack added to collection successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to add rack to collection'}), 500
            
    except Exception as e:
        logger.error(f"Failed to add rack to collection: {e}")
        return jsonify({'error': 'Failed to add rack to collection'}), 500

# =============================================================================
# ENHANCED SEARCH AND DISCOVERY ROUTES
# =============================================================================

@enhanced_bp.route('/search/advanced', methods=['GET'])
def advanced_search():
    """Advanced multi-criteria search"""
    try:
        # Get search parameters
        query = request.args.get('q', '')
        difficulty = request.args.get('difficulty')
        min_rating = request.args.get('min_rating', type=float)
        device_type = request.args.get('device_type')
        tags = request.args.getlist('tags')
        limit = request.args.get('limit', 20, type=int)
        
        # Build MongoDB query
        search_query = {}
        
        # Text search
        if query:
            search_query['$text'] = {'$search': query}
        
        # Difficulty filter
        if difficulty:
            search_query['metadata.difficulty'] = difficulty
        
        # Rating filter
        if min_rating:
            search_query['engagement.rating.average'] = {'$gte': min_rating}
        
        # Device type filter
        if device_type:
            search_query['tags.device_tags'] = {'$in': [device_type]}
        
        # Tags filter
        if tags:
            search_query['tags.user_tags'] = {'$in': tags}
        
        # Execute search
        if search_query:
            cursor = db.collection.find(search_query).sort('created_at', -1).limit(limit)
        else:
            cursor = db.collection.find().sort('created_at', -1).limit(limit)
        
        results = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            results.append(doc)
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'query': search_query
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to perform advanced search: {e}")
        return jsonify({'error': 'Failed to perform search'}), 500

@enhanced_bp.route('/trending', methods=['GET'])
def get_trending_racks():
    """Get trending racks based on recent engagement"""
    try:
        from datetime import datetime, timedelta
        
        # Get racks from last 30 days sorted by engagement score
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        pipeline = [
            {'$match': {'created_at': {'$gte': thirty_days_ago}}},
            {
                '$addFields': {
                    'engagement_score': {
                        '$add': [
                            {'$multiply': ['$engagement.view_count', 1]},
                            {'$multiply': ['$engagement.download_count', 3]},
                            {'$multiply': ['$engagement.favorite_count', 5]},
                            {'$multiply': ['$engagement.comment_count', 2]},
                            {'$multiply': ['$engagement.rating.average', 10]}
                        ]
                    }
                }
            },
            {'$sort': {'engagement_score': -1}},
            {'$limit': 20}
        ]
        
        results = list(db.collection.aggregate(pipeline))
        for doc in results:
            doc['_id'] = str(doc['_id'])
        
        return jsonify({
            'success': True,
            'trending': results,
            'count': len(results)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get trending racks: {e}")
        return jsonify({'error': 'Failed to get trending racks'}), 500

@enhanced_bp.route('/recommendations/<user_id>', methods=['GET'])
@token_required
def get_recommendations(current_user, user_id):
    """Get personalized recommendations for a user"""
    try:
        # Simple recommendation based on user's favorites and ratings
        # In a production system, this would use machine learning
        
        # Get user's favorite tags and difficulty preferences
        user_favorites = db.get_user_favorites(user_id)
        if not user_favorites:
            # Fallback to popular racks
            recommendations = db.get_most_downloaded_racks(10)
        else:
            # Extract common tags and difficulty levels from favorites
            tags = []
            difficulties = []
            for fav in user_favorites:
                if 'metadata' in fav and fav['metadata'].get('difficulty'):
                    difficulties.append(fav['metadata']['difficulty'])
                if 'tags' in fav and 'user_tags' in fav['tags']:
                    tags.extend(fav['tags']['user_tags'])
            
            # Find racks with similar characteristics
            query = {}
            if tags:
                query['tags.user_tags'] = {'$in': list(set(tags[:5]))}  # Top 5 tags
            elif difficulties:
                query['metadata.difficulty'] = {'$in': list(set(difficulties))}
            
            if query:
                cursor = db.collection.find(query).sort('engagement.rating.average', -1).limit(10)
                recommendations = []
                for doc in cursor:
                    doc['_id'] = str(doc['_id'])
                    recommendations.append(doc)
            else:
                recommendations = db.get_most_downloaded_racks(10)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        return jsonify({'error': 'Failed to get recommendations'}), 500

# =============================================================================
# ENHANCED UPLOAD FLOW ROUTES
# =============================================================================

@enhanced_bp.route('/upload/analyze', methods=['POST'])
def enhanced_analyze_upload():
    """Enhanced upload analysis with metadata support"""
    try:
        from security import validate_file_upload
        from werkzeug.utils import secure_filename
        import tempfile
        import shutil
        import os
        import base64
        
        # Import the analyzer functions
        import sys
        from pathlib import Path
        sys.path.append(str(Path(__file__).parent.parent.parent))
        from abletonRackAnalyzer import decompress_and_parse_ableton_file, parse_chains_and_devices
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file_obj = request.files['file']
        
        # Enhanced file validation
        is_valid, error_msg = validate_file_upload(file_obj)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Save uploaded file
            filename = secure_filename(file_obj.filename)
            filepath = os.path.join(temp_dir, filename)
            file_obj.save(filepath)
            
            # Analyze the rack
            xml_root = decompress_and_parse_ableton_file(filepath)
            if xml_root is None:
                return jsonify({'error': 'Failed to decompress or parse the file'}), 500
            
            # Parse chains and devices
            rack_info = parse_chains_and_devices(xml_root, filename, verbose=False)
            if rack_info is None:
                return jsonify({'error': 'Failed to analyze the rack structure'}), 500
            
            # Read file content for storage
            with open(filepath, 'rb') as f:
                file_content = f.read()
            file_content_b64 = base64.b64encode(file_content).decode('utf-8')
            
            # Generate auto-tags from device analysis
            auto_tags = db._extract_device_tags(rack_info)
            
            # Calculate complexity score
            complexity_score = db._calculate_complexity_score(rack_info)
            
            # Prepare enhanced response
            response_data = {
                'success': True,
                'analysis': rack_info,
                'filename': filename,
                'file_content': file_content_b64,
                'auto_tags': auto_tags,
                'complexity_score': complexity_score,
                'stats': {
                    'total_chains': len(rack_info.get('chains', [])),
                    'total_devices': db._count_all_devices(rack_info.get('chains', [])),
                    'macro_controls': len(rack_info.get('macro_controls', []))
                },
                'suggested_metadata': {
                    'title': rack_info.get('rack_name', filename.replace('.adg', '').replace('.adv', '')),
                    'auto_tags': auto_tags[:10],  # Top 10 auto tags
                    'difficulty': 'intermediate' if complexity_score > 50 else 'beginner' if complexity_score < 25 else 'intermediate'
                }
            }
            
            # Store temp directory reference
            from flask import current_app
            if not hasattr(current_app, 'temp_dirs'):
                current_app.temp_dirs = {}
            current_app.temp_dirs[filename] = temp_dir
            
            return jsonify(response_data), 200
            
        except Exception as e:
            # Cleanup on error
            shutil.rmtree(temp_dir, ignore_errors=True)
            return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Enhanced upload analysis failed: {e}")
        return jsonify({'error': f'Upload analysis failed: {str(e)}'}), 500

@enhanced_bp.route('/upload/complete', methods=['POST'])
def complete_enhanced_upload():
    """Complete the enhanced upload with full metadata"""
    try:
        from security import validate_metadata, sanitize_input
        import base64
        import shutil
        
        data = request.get_json()
        rack_info = data.get('analysis')
        filename = data.get('filename', 'unknown')
        enhanced_metadata = data.get('metadata', {})
        file_content_b64 = data.get('file_content')
        
        # Validate enhanced metadata
        is_valid, error_msg = validate_metadata(enhanced_metadata)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Sanitize all text inputs
        for key in ['title', 'description', 'difficulty']:
            if key in enhanced_metadata and enhanced_metadata[key]:
                enhanced_metadata[key] = sanitize_input(enhanced_metadata[key])
        
        # Sanitize tags
        if 'tags' in enhanced_metadata and enhanced_metadata['tags']:
            enhanced_metadata['tags'] = [sanitize_input(tag) for tag in enhanced_metadata['tags']]
        
        # Process annotations if provided
        annotations = data.get('annotations', [])
        
        # Decode file content
        file_content = base64.b64decode(file_content_b64) if file_content_b64 else b''
        
        # Save with enhanced metadata (no user auth for now)
        rack_id = db.save_rack_analysis(
            rack_info, 
            filename, 
            file_content, 
            user_id=None,
            enhanced_metadata=enhanced_metadata
        )
        
        if not rack_id:
            return jsonify({'error': 'Failed to save analysis'}), 500
        
        # Save annotations if provided (skip for now without user auth)
        annotation_ids = []
        # for annotation in annotations:
        #     if annotation.get('content', '').strip():
        #         annotation_id = db.create_annotation(rack_id, None, annotation)
        #         if annotation_id:
        #             annotation_ids.append(annotation_id)
        
        # Clean up temp directory
        from flask import current_app
        if hasattr(current_app, 'temp_dirs') and filename in current_app.temp_dirs:
            shutil.rmtree(current_app.temp_dirs[filename], ignore_errors=True)
            del current_app.temp_dirs[filename]
        
        # Initiate AI analysis
        try:
            from openai_integration import RackAIAnalyzer
            analyzer = RackAIAnalyzer()
            analysis_result = analyzer.analyze_rack(rack_id)
            if 'error' not in analysis_result:
                db.update_rack_ai_analysis(rack_id, analysis_result)
        except Exception as ai_error:
            logger.warning(f"AI analysis failed for rack {rack_id}: {ai_error}")
        
        return jsonify({
            'success': True,
            'rack_id': rack_id,
            'annotation_count': len(annotation_ids),
            'message': 'Rack uploaded and analyzed successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Enhanced upload completion failed: {e}")
        return jsonify({'error': f'Upload completion failed: {str(e)}'}), 500

# =============================================================================
# ENHANCED RACK MANAGEMENT ROUTES
# =============================================================================

@enhanced_bp.route('/racks/<rack_id>/view', methods=['POST'])
def increment_view_count(rack_id):
    """Increment view count for a rack"""
    try:
        success = db.increment_view_count(rack_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'View count updated'
            }), 200
        else:
            return jsonify({'error': 'Failed to update view count'}), 500
            
    except Exception as e:
        logger.error(f"Failed to increment view count: {e}")
        return jsonify({'error': 'Failed to update view count'}), 500

@enhanced_bp.route('/racks/<rack_id>/enhanced', methods=['GET'])
def get_enhanced_rack_data(rack_id):
    """Get enhanced rack data including annotations, comments, and ratings"""
    try:
        # Get base rack data
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        # Get annotations
        annotations = db.get_rack_annotations(rack_id)
        
        # Get comments
        comments = db.get_rack_comments(rack_id, 20)  # Latest 20 comments
        
        # Increment view count
        db.increment_view_count(rack_id)
        
        enhanced_data = {
            **rack,
            'annotations': annotations,
            'comments': comments,
            'annotation_count': len(annotations),
            'recent_comment_count': len(comments)
        }
        
        return jsonify({
            'success': True,
            'rack': enhanced_data
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get enhanced rack data: {e}")
        return jsonify({'error': 'Failed to retrieve rack data'}), 500