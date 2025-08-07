#!/usr/bin/env python3
"""
Flask backend for Ableton Rack Analyzer Web App - Optimized for v3 database structure
Updated to leverage embedded documents and reduce query complexity
"""

import os
import sys
import json
import tempfile
import shutil
import logging
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from bson import ObjectId
import jwt
from functools import wraps
import secrets
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from security import validate_password, validate_email, sanitize_username

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the analyzer modules
from abletonRackAnalyzer import decompress_and_parse_ableton_file, parse_chains_and_devices, export_xml_to_file, export_analysis_to_json

# Import optimized MongoDB helper
from db_v3_optimized import db_v3 as db

# Import AI routes
from ai_routes import ai_bp
from openai_integration import RackAIAnalyzer

# Get the project root directory  
project_root = Path(__file__).parent.parent
backend_root = Path(__file__).parent

app = Flask(__name__, 
           template_folder=str(project_root / 'templates'),
           static_folder=str(project_root / 'static'),
           static_url_path='/static')

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": os.getenv('ALLOWED_ORIGINS', '*').split(','),
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])

# Register AI routes blueprint
app.register_blueprint(ai_bp, url_prefix='/api')

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
ALLOWED_EXTENSIONS = {'adg', 'adv'}

# Security headers middleware
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Authentication decorator (simplified for v3 structure)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                logger.warning("Failed to extract token from Authorization header")
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            
            # Get user from v3 optimized structure
            current_user = db.users_collection.find_one({'_id': ObjectId(current_user_id)})
            if not current_user:
                return jsonify({'error': 'Invalid token'}), 401
                
            current_user['_id'] = str(current_user['_id'])
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return jsonify({'error': 'Token validation error'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# Frontend serving routes
@app.route('/')
def home():
    """Serve React frontend"""
    try:
        index_path = os.path.join(backend_root, 'static', 'frontend', 'index.html')
        if not os.path.exists(index_path):
            return jsonify({"error": "Frontend not found"}), 500
        return send_file(index_path)
    except Exception as e:
        logger.error(f"Error serving frontend: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/<path:path>')
def serve_frontend(path):
    """Serve React frontend assets and handle client-side routing"""
    if path.startswith('api/'):
        return {'error': 'API endpoint not found'}, 404
    
    static_file_path = os.path.join(backend_root, 'static', 'frontend', path)
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return send_file(static_file_path)
    
    return send_file(os.path.join(backend_root, 'static', 'frontend', 'index.html'))

# API Routes - Optimized for v3 embedded document structure

@app.route('/api/analyze', methods=['POST'])
@limiter.limit("10 per hour")
def analyze_rack():
    """
    Upload and analyze rack files with optimized v3 storage
    Single endpoint handles file upload, analysis, and embedding
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only .adg and .adv files are allowed'}), 400
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Get file content for storage
        with open(filepath, 'rb') as f:
            file_content = f.read()
        
        # Analyze the file
        logger.info(f"Analyzing file: {filename}")
        
        try:
            rack_info = decompress_and_parse_ableton_file(filepath)
            
            if not rack_info:
                return jsonify({'error': 'Failed to analyze the rack file'}), 400
            
            # Get enhanced metadata from request if provided
            enhanced_metadata = None
            if request.form.get('metadata'):
                try:
                    enhanced_metadata = json.loads(request.form.get('metadata'))
                except json.JSONDecodeError:
                    logger.warning("Invalid metadata JSON provided")
            
            # Get user ID from token if present
            user_id = None
            if 'Authorization' in request.headers:
                try:
                    auth_header = request.headers['Authorization']
                    token = auth_header.split(' ')[1]
                    data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                    user_id = data['user_id']
                except:
                    pass  # Continue as anonymous upload
            
            # Save with optimized v3 structure (single operation with all data embedded)
            rack_id = db.save_rack_analysis(
                rack_info, 
                filename, 
                file_content=file_content,
                user_id=user_id,
                enhanced_metadata=enhanced_metadata
            )
            
            if not rack_id:
                return jsonify({'error': 'Failed to save analysis'}), 500
            
            # Get the complete rack data (now a single query thanks to embedding)
            rack_data = db.get_rack_with_full_data(rack_id)
            
            if not rack_data:
                return jsonify({'error': 'Failed to retrieve saved analysis'}), 500
            
            logger.info(f"Successfully analyzed and saved rack with ID: {rack_id}")
            
            return jsonify({
                'success': True,
                'rack_id': rack_id,
                'analysis': rack_data,
                'message': 'Rack analyzed and saved successfully'
            }), 200
            
        except Exception as e:
            logger.error(f"Error analyzing rack file: {e}")
            return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
        
        finally:
            # Clean up uploaded file
            try:
                os.remove(filepath)
            except OSError:
                pass
    
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/racks/<rack_id>', methods=['GET'])
def get_rack(rack_id):
    """
    Get complete rack data with all embedded information
    Single query returns everything: annotations, comments, ratings
    """
    try:
        if not ObjectId.is_valid(rack_id):
            return jsonify({'error': 'Invalid rack ID'}), 400
        
        # Single query gets all data thanks to v3 embedding
        rack_data = db.get_rack_with_full_data(rack_id)
        
        if not rack_data:
            return jsonify({'error': 'Rack not found'}), 404
        
        # The v3 structure already includes all related data embedded
        return jsonify({
            'success': True,
            'rack': rack_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving rack {rack_id}: {e}")
        return jsonify({'error': 'Failed to retrieve rack'}), 500

@app.route('/api/racks', methods=['GET'])
def get_recent_racks():
    """Get recent racks with embedded data"""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        
        # Single query gets all embedded data
        racks = db.get_recent_racks(limit)
        
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recent racks: {e}")
        return jsonify({'error': 'Failed to retrieve racks'}), 500

@app.route('/api/racks/search', methods=['GET'])
def search_racks():
    """Search racks with embedded data"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Query must be at least 2 characters'}), 400
        
        # Search with embedded data
        racks = db.search_racks(query)
        
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks),
            'query': query
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching racks: {e}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/api/racks/<rack_id>/comments', methods=['POST'])
@token_required
def add_comment(current_user, rack_id):
    """
    Add comment with optimized embedding
    Comments are embedded directly in rack document
    """
    try:
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({'error': 'Comment content required'}), 400
        
        content = data['content'].strip()
        if not content or len(content) > 1000:
            return jsonify({'error': 'Comment must be 1-1000 characters'}), 400
        
        parent_comment_id = data.get('parent_comment_id')
        
        # Add comment with automatic overflow management
        success = db.add_comment(
            rack_id, 
            current_user['_id'], 
            content, 
            current_user['username'],
            parent_comment_id
        )
        
        if not success:
            return jsonify({'error': 'Failed to add comment'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Comment added successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        return jsonify({'error': 'Failed to add comment'}), 500

@app.route('/api/racks/<rack_id>/ratings', methods=['POST'])
@token_required
def rate_rack(current_user, rack_id):
    """
    Rate rack with embedded ratings and automatic overflow management
    """
    try:
        data = request.get_json()
        
        if not data or 'rating' not in data:
            return jsonify({'error': 'Rating required'}), 400
        
        rating = int(data['rating'])
        if not 1 <= rating <= 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        review = data.get('review', '').strip()
        if len(review) > 500:
            return jsonify({'error': 'Review must be less than 500 characters'}), 400
        
        # Rate with automatic overflow management and recalculation
        success = db.rate_rack(
            rack_id,
            current_user['_id'],
            rating,
            current_user['username'],
            review if review else None
        )
        
        if not success:
            return jsonify({'error': 'Failed to rate rack'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Rating added successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error rating rack: {e}")
        return jsonify({'error': 'Failed to rate rack'}), 500

@app.route('/api/racks/<rack_id>/annotations', methods=['POST'])
@token_required
def add_annotation(current_user, rack_id):
    """
    Add annotation with embedded storage
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Annotation data required'}), 400
        
        # Validate annotation data
        annotation_data = {
            'type': data.get('type', 'general'),
            'component_id': data.get('component_id', ''),
            'position': data.get('position', {'x': 0, 'y': 0}),
            'content': data.get('content', '').strip()
        }
        
        if len(annotation_data['content']) > 500:
            return jsonify({'error': 'Annotation content too long'}), 400
        
        # Add annotation with automatic management
        success = db.add_annotation(rack_id, current_user['_id'], annotation_data)
        
        if not success:
            return jsonify({'error': 'Failed to add annotation'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Annotation added successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error adding annotation: {e}")
        return jsonify({'error': 'Failed to add annotation'}), 500

@app.route('/api/racks/<rack_id>/download', methods=['POST'])
def download_rack(rack_id):
    """Download rack and increment download count"""
    try:
        if not ObjectId.is_valid(rack_id):
            return jsonify({'error': 'Invalid rack ID'}), 400
        
        # Get rack data
        rack_data = db.get_rack_with_full_data(rack_id)
        
        if not rack_data or 'file_content' not in rack_data:
            return jsonify({'error': 'Rack file not available'}), 404
        
        # Increment download count atomically
        db.increment_download_count(rack_id)
        
        # Prepare file for download
        import base64
        file_content = base64.b64decode(rack_data['file_content'].encode('utf-8'))
        
        # Create temporary file
        temp_path = os.path.join(tempfile.gettempdir(), f"{rack_data['filename']}")
        with open(temp_path, 'wb') as f:
            f.write(file_content)
        
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=rack_data['filename'],
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"Error downloading rack: {e}")
        return jsonify({'error': 'Download failed'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with database connectivity"""
    try:
        # Test database connection
        if not db.connected:
            db.connect()
        
        if not db.connected:
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        # Test database query
        rack_count = db.racks_collection.count_documents({})
        
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'rack_count': rack_count,
            'timestamp': datetime.utcnow().isoformat(),
            'version': 'v3-optimized'
        }), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

# Error handlers
@app.errorhandler(413)
def file_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    
    # Connect to optimized database
    if not db.connect():
        logger.error("Failed to connect to database. Exiting.")
        sys.exit(1)
    
    logger.info(f"Starting Ableton Rack Analyzer v3 server on port {port}")
    
    # Clean up temp directory on startup
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        shutil.rmtree(app.config['UPLOAD_FOLDER'])
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    app.run(host='0.0.0.0', port=port, debug=False)