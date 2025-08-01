"""
AI workflow routes for Flask backend
Provides API endpoints to interact with FlowiseAI
"""

from flask import Blueprint, jsonify, request
import jwt
from functools import wraps
import os
import sys
from pathlib import Path
from datetime import datetime

# Add AI workflows directory to path
sys.path.append(str(Path(__file__).parent.parent / 'ai_workflows' / 'scripts'))

from flowise_integration import FlowiseAIClient, MongoDBFlowiseAdapter
from db import MongoDB

ai_bp = Blueprint('ai', __name__)

# Initialize clients (reuse across requests)
_flowise_client = None
_mongodb_adapter = None

# JWT required decorator (matching the one in app.py)
def jwt_required():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            
            # Get token from header
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                try:
                    token = auth_header.split(' ')[1]  # Bearer <token>
                except IndexError:
                    pass
            
            if not token:
                return jsonify({'error': 'Token is missing'}), 401
            
            try:
                # Get secret key from environment or use default
                secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
                data = jwt.decode(token, secret_key, algorithms=['HS256'])
                current_user_id = data['user_id']
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def get_flowise_adapter():
    """Get or create FlowiseAI adapter"""
    global _flowise_client, _mongodb_adapter
    if _flowise_client is None:
        _flowise_client = FlowiseAIClient()
    if _mongodb_adapter is None:
        mongodb = MongoDB()
        mongodb.connect()
        _mongodb_adapter = MongoDBFlowiseAdapter(_flowise_client, mongodb)
    return _mongodb_adapter

@ai_bp.route('/ai/status', methods=['GET'])
def ai_status():
    """Check AI service status"""
    try:
        adapter = get_flowise_adapter()
        flowise_url = adapter.client.base_url
        mongodb_connected = adapter.mongodb.connected
        
        return jsonify({
            'status': 'operational',
            'flowise_url': flowise_url,
            'mongodb_connected': mongodb_connected,
            'message': 'AI services are ready'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@ai_bp.route('/ai/sync-racks', methods=['POST'])
@jwt_required()
def sync_racks():
    """Sync racks from MongoDB to FlowiseAI"""
    try:
        data = request.get_json()
        limit = data.get('limit', 100)  # Default to 100 racks
        
        adapter = get_flowise_adapter()
        results = adapter.sync_racks_to_flowise(limit)
        
        return jsonify({
            'success': True,
            'synced_count': len(results),
            'message': f'Successfully synced {len(results)} racks to FlowiseAI'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/ai/create-chatflow', methods=['POST'])
@jwt_required()
def create_chatflow():
    """Create a new rack analysis chatflow"""
    try:
        adapter = get_flowise_adapter()
        chatflow = adapter.create_rack_analysis_chatflow()
        
        # Store chatflow ID in environment or database for future use
        os.environ['FLOWISE_CHATFLOW_ID'] = chatflow['id']
        
        return jsonify({
            'success': True,
            'chatflow_id': chatflow['id'],
            'message': 'Rack analysis chatflow created successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/ai/analyze', methods=['POST'])
@jwt_required()
def analyze_racks():
    """Analyze racks with AI"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        chatflow_id = data.get('chatflow_id') or os.getenv('FLOWISE_CHATFLOW_ID')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter is required'
            }), 400
        
        if not chatflow_id:
            return jsonify({
                'success': False,
                'error': 'Chatflow ID not found. Please create a chatflow first.'
            }), 400
        
        adapter = get_flowise_adapter()
        result = adapter.search_and_analyze(query, chatflow_id)
        
        # Convert ObjectId to string for JSON serialization
        for rack in result.get('results', []):
            if '_id' in rack:
                rack['_id'] = str(rack['_id'])
        
        return jsonify({
            'success': True,
            'query': result['query'],
            'rack_count': len(result['results']),
            'analysis': result['analysis'],
            'results': result['results'][:10]  # Limit to first 10 results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/ai/rack/<rack_id>/insights', methods=['GET'])
@jwt_required()
def get_rack_insights(rack_id):
    """Get AI insights for a specific rack"""
    try:
        chatflow_id = request.args.get('chatflow_id') or os.getenv('FLOWISE_CHATFLOW_ID')
        
        if not chatflow_id:
            return jsonify({
                'success': False,
                'error': 'Chatflow ID not found. Please create a chatflow first.'
            }), 400
        
        adapter = get_flowise_adapter()
        
        # Get rack from MongoDB
        rack = adapter.mongodb.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({
                'success': False,
                'error': 'Rack not found'
            }), 404
        
        # Prepare query for specific rack
        query = f"""Analyze this Ableton rack and provide insights:
        Name: {rack.get('rack_name', 'Unknown')}
        Devices: {rack.get('stats', {}).get('total_devices', 0)}
        Chains: {rack.get('stats', {}).get('total_chains', 0)}
        Macros: {rack.get('stats', {}).get('macro_controls', 0)}
        
        Provide suggestions for improvement and identify any interesting patterns."""
        
        insights = adapter.query_rack_insights(chatflow_id, query)
        
        return jsonify({
            'success': True,
            'rack_id': rack_id,
            'rack_name': rack.get('rack_name', 'Unknown'),
            'insights': insights
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_bp.route('/ai/batch-process', methods=['POST'])
@jwt_required()
def batch_process_racks():
    """Process multiple rack files for AI training"""
    try:
        data = request.get_json()
        directory_path = data.get('directory', '/tmp/racks')
        
        # Import the prepare script
        from prepare_rack_data import RackDataProcessor
        
        processor = RackDataProcessor()
        dataset_path = processor.process_directory(directory_path)
        
        # Optionally create training splits
        if data.get('create_splits', False):
            train_path, val_path = processor.create_training_splits(
                str(dataset_path),
                data.get('train_ratio', 0.8)
            )
            
            return jsonify({
                'success': True,
                'dataset_path': str(dataset_path),
                'train_path': str(train_path),
                'val_path': str(val_path)
            })
        
        return jsonify({
            'success': True,
            'dataset_path': str(dataset_path)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
