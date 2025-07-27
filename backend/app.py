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
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path to import the analyzer modules
sys.path.append(str(Path(__file__).parent.parent.parent))
from abletonRackAnalyzer import decompress_and_parse_ableton_file, parse_chains_and_devices, export_xml_to_file, export_analysis_to_json

# Import MongoDB helper
from db import db

app = Flask(__name__, static_folder='..', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
ALLOWED_EXTENSIONS = {'adg', 'adv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def serve_index():
    """Serve the main index.html"""
    return app.send_static_file('index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Ableton Rack Analyzer API is running'})

@app.route('/api/analyze', methods=['POST'])
def analyze_rack():
    """Analyze an uploaded Ableton rack file"""
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
            
            # Parse chains and devices
            rack_info = parse_chains_and_devices(xml_root, filename, verbose=False)
            if rack_info is None:
                return jsonify({'error': 'Failed to analyze the rack structure'}), 500
            
            # Export XML and JSON files
            xml_path = export_xml_to_file(xml_root, filepath, temp_dir)
            json_path = export_analysis_to_json(rack_info, filepath, temp_dir)
            
            # Get user info from form data
            description = request.form.get('description', '').strip()
            producer_name = request.form.get('producer_name', '').strip()
            
            # Add user info to rack_info if provided
            if description or producer_name:
                rack_info['user_info'] = {}
                if description:
                    rack_info['user_info']['description'] = description
                if producer_name:
                    rack_info['user_info']['producer_name'] = producer_name
            
            # Save to MongoDB
            try:
                # Read the original file content for storage
                with open(filepath, 'rb') as f:
                    file_content = f.read()
                
                rack_id = db.save_rack_analysis(rack_info, filename, file_content)
                if rack_id:
                    logger.info(f"Saved rack analysis to MongoDB with ID: {rack_id}")
                else:
                    logger.warning("Failed to save rack analysis to MongoDB")
            except Exception as e:
                logger.error(f"Error saving to MongoDB: {e}")
                # Don't fail the request if MongoDB save fails
            
            # Prepare response data
            response_data = {
                'success': True,
                'analysis': rack_info,
                'filename': filename,
                'stats': {
                    'total_chains': len(rack_info.get('chains', [])),
                    'total_devices': sum(len(chain.get('devices', [])) for chain in rack_info.get('chains', [])),
                    'macro_controls': len(rack_info.get('macro_controls', []))
                }
            }
            
            # Add MongoDB ID if available
            if 'rack_id' in locals() and rack_id:
                response_data['rack_id'] = rack_id
            
            # Store paths for download endpoints
            response_data['download_ids'] = {
                'xml': os.path.basename(xml_path) if xml_path else None,
                'json': os.path.basename(json_path) if json_path else None
            }
            
            # Store temp directory in app context for cleanup
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
        rack = db.get_rack_analysis(rack_id)
        if rack:
            return jsonify({
                'success': True,
                'rack': rack
            }), 200
        else:
            return jsonify({'error': 'Rack not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to get rack: {str(e)}'}), 500

@app.route('/api/racks/search', methods=['GET'])
def search_racks():
    """Search racks by name or filename"""
    try:
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
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

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

if __name__ == '__main__':
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Run the app
    app.run(debug=False, port=5001)
