#!/usr/bin/env python3
"""
Flask backend for Ableton Rack Analyzer Web App
"""

import os
import sys
import json
import tempfile
import shutil
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import jwt
from functools import wraps
import secrets
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from security import validate_password, validate_email, sanitize_username

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the analyzer modules (they're in the same directory)
from abletonRackAnalyzer import decompress_and_parse_ableton_file, parse_chains_and_devices, export_xml_to_file, export_analysis_to_json

# Import MongoDB helper
from db import db

# Import AI routes
from ai_routes import ai_bp
from openai_integration import RackAIAnalyzer

# Import enhanced routes
from enhanced_routes import enhanced_bp

# Get the project root directory  
project_root = Path(__file__).parent.parent
backend_root = Path(__file__).parent

app = Flask(__name__, 
           template_folder=str(project_root / 'templates'),
           static_folder=str(project_root / 'static'),
           static_url_path='/static')

# Configure CORS with more restrictive settings
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

# Register enhanced routes blueprint
app.register_blueprint(enhanced_bp, url_prefix='/api')

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookies over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to cookies
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
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
        "script-src 'self' 'unsafe-inline'; "  # We'll need unsafe-inline for now, can refactor later
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer ctokene
            except IndexError:
                pass
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
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

@app.route('/')
def home():
    """Serve React frontend"""
    try:
        index_path = os.path.join(backend_root, 'static', 'frontend', 'index.html')
        logger.info(f"Attempting to serve index.html from: {index_path}")
        logger.info(f"File exists: {os.path.exists(index_path)}")
        logger.info(f"Project root: {project_root}")
        if not os.path.exists(index_path):
            logger.error(f"index.html not found at {index_path}")
            return jsonify({"error": "Frontend not found", "path": str(index_path)}), 500
        return send_file(index_path)
    except Exception as e:
        logger.error(f"Error serving frontend: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/<path:path>')
def serve_frontend(path):
    """Serve React frontend assets and handle client-side routing"""
    # Check if it's an API route
    if path.startswith('api/'):
        return {'error': 'API endpoint not found'}, 404
    
    # Try to serve static assets first
    static_file_path = os.path.join(backend_root, 'static', 'frontend', path)
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return send_file(static_file_path)
    
    # For client-side routing, serve index.html
    return send_file(os.path.join(backend_root, 'static', 'frontend', 'index.html'))

@app.route('/test_visualization.html')
def test_visualization():
    """Test visualization page"""
    return send_file(os.path.join(project_root, 'test_visualization.html'))

# Template routes
@app.route('/search')
def search_page():
    """Search page"""
    return render_template('search.html')

@app.route('/legacy')
def serve_legacy_index():
    """Serve the legacy template-based index.html"""
    return render_template('index.html')

@app.route('/legacy/search')
def serve_legacy_search():
    """Serve the legacy search page"""
    return render_template('search.html')

@app.route('/api/racks/<rack_id>/favorite', methods=['POST'])
@token_required
def toggle_favorite(current_user, rack_id):
    """Toggle favorite status"""
    result = db.toggle_favorite(current_user['_id'], rack_id)
    if result is not None:
        return jsonify({'success': True, 'favorited': result}), 200
    return jsonify({'error': 'Failed to toggle favorite'}), 500

@app.route('/api/user/favorites', methods=['GET'])
@token_required
def get_user_favorites(current_user):
    """Get user favorites"""
    favorites = db.get_user_favorites(current_user['_id'])
    return jsonify({'success': True, 'favorites': favorites})

@app.route('/api/racks/popular', methods=['GET'])
def get_popular_racks():
    """Get most downloaded racks"""
    try:
        limit = request.args.get('limit', 10, type=int)
        racks = db.get_most_downloaded_racks(limit)
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get popular racks: {str(e)}'}), 500

@app.route('/rack/<rack_id>')
def serve_rack_page(rack_id):
    """Serve the individual rack page"""
    return render_template('rack.html', rack_id=rack_id)

@app.route('/login')
def serve_login():
    """Serve the login page"""
    return render_template('login.html')

@app.route('/register')
def serve_register():
    """Serve the register page"""
    return render_template('register.html')

@app.route('/profile')
def serve_profile():
    """Serve the user profile page"""
    return render_template('profile.html')

@app.route('/upload')
def serve_upload():
    """Serve the upload page"""
    return render_template('upload.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Ableton Rack Analyzer API is running', 'timestamp': '2025-08-04'})

@app.route('/api/analyze', methods=['POST'])
def analyze_rack_initial():
    """Perform initial analysis of an uploaded Ableton rack file without saving"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only .adg and .adv files are allowed'}), 400
        
        # Create a temporary directory for this request
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Save the uploaded file
            filename = secure_filename(file.filename)
            filepath = os.path.join(temp_dir, filename)
            file.save(filepath)
            
            # Analyze the rack
            xml_root = decompress_and_parse_ableton_file(filepath)
            if xml_root is None:
                return jsonify({'error': 'Failed to decompress or parse the file'}), 500
            
            # Parse chains and devices (enable verbose in debug mode)
            verbose_parsing = app.debug or os.getenv('FLASK_ENV') == 'development'
            rack_info = parse_chains_and_devices(xml_root, filename, verbose=verbose_parsing)
            if rack_info is None:
                return jsonify({'error': 'Failed to analyze the rack structure'}), 500
            
            # Export XML and JSON files
            xml_path = export_xml_to_file(xml_root, filepath, temp_dir)
            json_path = export_analysis_to_json(rack_info, filepath, temp_dir)
            
            # Read file content and encode as base64 for client storage
            import base64
            with open(filepath, 'rb') as f:
                file_content = f.read()
            file_content_b64 = base64.b64encode(file_content).decode('utf-8')
            
            # Prepare response without saving
            response_data = {
                'success': True,
                'analysis': rack_info,
                'filename': filename,
                'file_content': file_content_b64,  # Include for client-side storage
                'stats': {
                    'total_chains': len(rack_info.get('chains', [])),
                    'total_devices': sum(len(chain.get('devices', [])) for chain in rack_info.get('chains', [])),
                    'macro_controls': len(rack_info.get('macro_controls', []))
                },
                'download_ids': {
                    'xml': os.path.basename(xml_path) if xml_path else None,
                    'json': os.path.basename(json_path) if json_path else None
                }
            }
            
            # Store temp directory in app context
            if not hasattr(app, 'temp_dirs'):
                app.temp_dirs = {}
            app.temp_dirs[filename] = temp_dir
            
            return jsonify(response_data), 200
            
        except Exception as e:
            # Cleanup on error
            shutil.rmtree(temp_dir, ignore_errors=True)
            return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/api/analyze/complete', methods=['POST'])
@token_required
def complete_analysis(current_user):
    """Complete the analysis by saving metadata after initial analysis"""
    try:
        data = request.get_json()
        rack_info = data.get('analysis')
        filename = data.get('filename', 'unknown')
        user_info = data.get('user_info', {})
        file_content_b64 = data.get('file_content')
        
        # Include user info in rack_info
        rack_info['user_info'] = {
            'producer_name': current_user.get('username'),
            'description': user_info.get('description', ''),
            'rack_type': user_info.get('rack_type', ''),
            'tags': user_info.get('tags', [])
        }
        
        # Update chains and devices with user-provided names/descriptions if provided
        if 'chains' in user_info:
            for i, chain_update in enumerate(user_info['chains']):
                if i < len(rack_info.get('chains', [])):
                    if 'name' in chain_update:
                        rack_info['chains'][i]['name'] = chain_update['name']
                    if 'description' in chain_update:
                        rack_info['chains'][i]['description'] = chain_update['description']
                    # Update devices within chains
                    if 'devices' in chain_update:
                        for j, device_update in enumerate(chain_update['devices']):
                            if j < len(rack_info['chains'][i].get('devices', [])):
                                if 'name' in device_update:
                                    rack_info['chains'][i]['devices'][j]['name'] = device_update['name']
                                if 'description' in device_update:
                                    rack_info['chains'][i]['devices'][j]['description'] = device_update['description']
        
        # Update macro controls if provided
        if 'macro_controls' in user_info:
            for i, macro_update in enumerate(user_info['macro_controls']):
                if i < len(rack_info.get('macro_controls', [])):
                    if 'name' in macro_update:
                        rack_info['macro_controls'][i]['name'] = macro_update['name']
                    if 'description' in macro_update:
                        rack_info['macro_controls'][i]['description'] = macro_update['description']
        
        # Save to MongoDB
        try:
            # Decode base64 file content
            import base64
            file_content = base64.b64decode(file_content_b64) if file_content_b64 else b''
            
            rack_id = db.save_rack_analysis(rack_info, filename, file_content, user_id=current_user['_id'])
            if rack_id:
                logger.info(f"Saved rack analysis to MongoDB with ID: {rack_id}")
                
                # Clean up temp directory if it exists
                if hasattr(app, 'temp_dirs') and filename in app.temp_dirs:
                    shutil.rmtree(app.temp_dirs[filename], ignore_errors=True)
                    del app.temp_dirs[filename]
            else:
                logger.warning("Failed to save rack analysis to MongoDB")
                return jsonify({'error': 'Failed to save analysis'}), 500
        except Exception as e:
            logger.error(f"Error saving to MongoDB: {str(e)}")
            return jsonify({'error': f'Failed to save analysis: {str(e)}'}), 500
        
        # Initiate AI analysis automatically
        try:
            analyzer = RackAIAnalyzer()
            analysis_result = analyzer.analyze_rack(rack_id)
            if 'error' in analysis_result:
                logger.warning(f"AI analysis failed for rack {rack_id}: {analysis_result['error']}")
                # Don't fail the whole operation if AI analysis fails
                analysis_result = None
            else:
                logger.info(f"AI analysis complete for rack {rack_id}")
                # Save AI analysis to the rack document
                db.update_rack_ai_analysis(rack_id, analysis_result)
        except Exception as ai_error:
            logger.error(f"AI analysis error for rack {rack_id}: {str(ai_error)}")
            analysis_result = None
        
        # Vector storage removed - no longer storing embeddings
        
        return jsonify({
            'success': True, 
            'rack_id': rack_id, 
            'ai_analysis': analysis_result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Completion failed: {str(e)}'}), 500

@app.route('/api/download/<file_type>/<filename>', methods=['GET'])
def download_file(file_type, filename):
    """Download generated XML or JSON files"""
    try:
        # Security check
        filename = secure_filename(filename)
        
        # Find the temp directory
        base_filename = filename.replace('.xml', '').replace('_analysis.json', '')
        for key in getattr(app, 'temp_dirs', {}):
            if base_filename in key:
                temp_dir = app.temp_dirs[key]
                filepath = os.path.join(temp_dir, filename)
                
                if os.path.exists(filepath):
                    return send_file(filepath, as_attachment=True, download_name=filename)
        
        return jsonify({'error': 'File not found'}), 404
        
    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

@app.route('/api/racks', methods=['GET'])
def get_recent_racks():
    """Get recently analyzed racks from MongoDB"""
    try:
        limit = request.args.get('limit', 10, type=int)
        racks = db.get_recent_racks(limit)
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get racks: {str(e)}'}), 500

@app.route('/api/racks/<rack_id>', methods=['GET'])
def get_rack_by_id(rack_id):
    """Get a specific rack analysis by ID"""
    try:
        from bson import ObjectId
        
        # Validate rack_id parameter
        if not rack_id or rack_id in ['undefined', 'null', 'None']:
            return jsonify({'error': 'Invalid rack ID provided'}), 400
            
        if not ObjectId.is_valid(rack_id):
            return jsonify({'error': 'Invalid rack ID format'}), 400
        
        rack = db.get_rack_analysis(rack_id)
        if rack:
            return jsonify({
                'success': True,
                'rack': rack
            }), 200
        else:
            return jsonify({'error': 'Rack not found'}), 404
    except Exception as e:
        logger.error(f"Error in get_rack_by_id for rack_id '{rack_id}': {str(e)}")
        return jsonify({'error': f'Failed to get rack: {str(e)}'}), 500

@app.route('/api/racks/search', methods=['GET', 'POST'])
def search_racks():
    """Search racks by name, filename, and optionally tags"""
    try:
        # Support both GET (text only) and POST (text + tags)
        if request.method == 'GET':
            query = request.args.get('q', '')
            if not query:
                return jsonify({'error': 'Search query required'}), 400
            
            racks = db.search_racks(query)
            return jsonify({
                'success': True,
                'racks': racks,
                'count': len(racks),
                'query': query
            }), 200
        else:  # POST
            data = request.get_json()
            query = data.get('query', '')
            tags = data.get('tags', [])
            
            if not query and not tags:
                return jsonify({'error': 'Either query or tags required'}), 400
            
            # If we have both query and tags, we need to combine the results
            if query and tags:
                # Get text search results
                text_results = db.search_racks(query)
                # Get tag search results
                tag_results = db.search_by_tags(tags)
                
                # Find intersection (racks that match both criteria)
                text_ids = {str(r['_id']) for r in text_results}
                tag_ids = {str(r['_id']) for r in tag_results}
                matching_ids = text_ids.intersection(tag_ids)
                
                # Filter to only matching racks
                racks = [r for r in text_results if str(r['_id']) in matching_ids]
            elif query:
                racks = db.search_racks(query)
            else:  # tags only
                racks = db.search_by_tags(tags)
            
            return jsonify({
                'success': True,
                'racks': racks,
                'count': len(racks),
                'query': query,
                'tags': tags
            }), 200
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@app.route('/api/tags/popular', methods=['GET'])
def get_popular_tags():
    """Get popular tags for auto-suggestions"""
    try:
        tags = db.get_popular_tags(limit=20)
        return jsonify({'success': True, 'tags': tags}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get popular tags: {str(e)}'}), 500

@app.route('/api/racks/by-tags', methods=['POST'])
def search_by_tags():
    """Search racks by tags"""
    try:
        data = request.get_json()
        tags = data.get('tags', [])
        
        if not tags:
            return jsonify({'error': 'No tags provided'}), 400
        
        racks = db.search_by_tags(tags)
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks),
            'tags': tags
        }), 200
    except Exception as e:
        return jsonify({'error': f'Tag search failed: {str(e)}'}), 500

@app.route('/api/racks/<rack_id>/download', methods=['GET'])
def download_rack_file(rack_id):
    """Download the original .adg file for a rack"""
    try:
        from bson import ObjectId
        
        # Validate rack_id parameter
        if not rack_id or rack_id in ['undefined', 'null', 'None']:
            return jsonify({'error': 'Invalid rack ID provided'}), 400
            
        if not ObjectId.is_valid(rack_id):
            return jsonify({'error': 'Invalid rack ID format'}), 400
        
        # Increment download count
        db.increment_download_count(rack_id)
        
        # Get rack from database
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        # Check if file content exists
        if 'file_content' not in rack:
            return jsonify({'error': 'Original file not available'}), 404
        
        # Decode the base64 content
        import base64
        file_content = base64.b64decode(rack['file_content'])
        
        # Get the original filename
        filename = rack.get('filename', 'rack.adg')
        
        # Create a temporary file
        import io
        return send_file(
            io.BytesIO(file_content),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Failed to download rack file: {e}")
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    """Clean up temporary files"""
    try:
        # Clean up all temp directories
        for temp_dir in getattr(app, 'temp_dirs', {}).values():
            shutil.rmtree(temp_dir, ignore_errors=True)
        app.temp_dirs = {}
        
        return jsonify({'success': True, 'message': 'Cleanup completed'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500

# Authentication Routes
@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per hour")
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        username = sanitize_username(data.get('username', '').strip())
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        email_valid, email_error = validate_email(email)
        if not email_valid:
            return jsonify({'error': email_error}), 400
        
        password_valid, password_error = validate_password(password)
        if not password_valid:
            return jsonify({'error': password_error}), 400
        
        # Create user
        user_id = db.create_user(username, email, password)
        
        if not user_id:
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Create JWT token
        from datetime import datetime, timedelta
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per hour")
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Authenticate user
        user = db.authenticate_user(username, password)
        
        if not user:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create JWT token
        from datetime import datetime, timedelta
        token = jwt.encode({
            'user_id': user['_id'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile"""
    try:
        # Get user's racks
        user_racks = db.get_user_racks(current_user['_id'], limit=20)
        
        return jsonify({
            'success': True,
            'user': current_user,
            'racks': user_racks
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get profile: {e}")
        return jsonify({'error': 'Failed to get profile'}), 500

@app.route('/api/user/racks', methods=['GET'])
@token_required
def get_user_racks(current_user):
    """Get all racks uploaded by current user"""
    try:
        limit = request.args.get('limit', 50, type=int)
        racks = db.get_user_racks(current_user['_id'], limit=limit)
        
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user racks: {e}")
        return jsonify({'error': 'Failed to get user racks'}), 500

@app.route('/api/producer/<producer_name>/racks', methods=['GET'])
def get_producer_racks(producer_name):
    """Get all racks by producer name (for attribution and profiles)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        racks = db.get_racks_by_producer(producer_name, limit=limit)
        
        return jsonify({
            'success': True,
            'racks': racks,
            'count': len(racks),
            'producer_name': producer_name
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get producer racks: {e}")
        return jsonify({'error': 'Failed to get producer racks'}), 500

if __name__ == '__main__':
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Get port from environment variable (Railway sets this)
    port = int(os.environ.get('PORT', 5001))
    
    # Run the app
    app.run(debug=False, host='0.0.0.0', port=port)
