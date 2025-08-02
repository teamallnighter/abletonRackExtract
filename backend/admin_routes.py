"""
Admin routes for maintenance operations
"""

from flask import Blueprint, request, jsonify
from vector_storage import vector_storage
from db import db
from functools import wraps
import os
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
admin_bp = Blueprint('admin', __name__)

# Simple admin authentication
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        admin_key = request.headers.get('X-Admin-Key')
        expected_key = os.getenv('ADMIN_API_KEY', 'your-secret-admin-key')
        
        if not admin_key or admin_key != expected_key:
            return jsonify({'error': 'Unauthorized'}), 401
            
        return f(*args, **kwargs)
    
    return decorated

@admin_bp.route('/admin/backfill-embeddings', methods=['POST'])
@admin_required
def backfill_embeddings():
    """Backfill embeddings for all existing racks"""
    try:
        # Connect to vector storage
        if not vector_storage.connect():
            return jsonify({'error': 'Failed to connect to vector storage'}), 500
        
        # Ensure MongoDB connection
        if not db.connect():
            return jsonify({'error': 'Failed to connect to database'}), 500
        
        # Get all racks
        all_racks = []
        cursor = db.collection.find({})
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            all_racks.append(doc)
        
        total_racks = len(all_racks)
        success_count = 0
        error_count = 0
        errors = []
        
        # Process each rack
        for rack in all_racks:
            rack_id = rack['_id']
            rack_name = rack.get('rack_name', 'Unknown')
            
            try:
                if vector_storage.store_rack_embedding(rack_id, rack):
                    success_count += 1
                else:
                    error_count += 1
                    errors.append(f"Failed to store embedding for {rack_name} ({rack_id})")
            except Exception as e:
                error_count += 1
                errors.append(f"Error processing {rack_name} ({rack_id}): {str(e)}")
        
        return jsonify({
            'success': True,
            'total_racks': total_racks,
            'successful': success_count,
            'errors': error_count,
            'error_details': errors[:10]  # Limit error details
        }), 200
        
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        return jsonify({'error': f'Backfill failed: {str(e)}'}), 500

@admin_bp.route('/admin/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get system statistics"""
    try:
        # Ensure MongoDB connection
        if not db.connect():
            return jsonify({'error': 'Failed to connect to database'}), 500

        # Get MongoDB stats
        total_racks = db.collection.count_documents({})
        racks_with_ai = db.collection.count_documents({'ai_analysis': {'$exists': True}})
        total_users = db.users_collection.count_documents({})
        
        return jsonify({
            'success': True,
            'stats': {
                'total_racks': total_racks,
                'racks_with_ai_analysis': racks_with_ai,
                'total_users': total_users,
                'vector_storage_connected': vector_storage.initialized
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500
