"""
AI routes for Flask backend
Provides API endpoints for OpenAI-based rack analysis
"""

from flask import Blueprint, jsonify, request
import jwt
from functools import wraps
import os
from openai_integration import RackAIAnalyzer

ai_bp = Blueprint('ai', __name__)

# Initialize AI analyzer (reuse across requests)
_ai_analyzer = None

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

def get_ai_analyzer():
    """Get or create AI analyzer instance"""
    global _ai_analyzer
    if _ai_analyzer is None:
        try:
            _ai_analyzer = RackAIAnalyzer()
        except ValueError as e:
            # OpenAI API key not set
            return None, str(e)
    return _ai_analyzer, None

@ai_bp.route('/ai/status', methods=['GET'])
def ai_status():
    """Check AI service status"""
    analyzer, error = get_ai_analyzer()
    
    if error:
        return jsonify({
            'status': 'error',
            'message': 'AI services not configured',
            'error': error,
            'setup_instructions': 'Set OPENAI_API_KEY environment variable in Railway'
        }), 500
    
    return jsonify({
        'status': 'operational',
        'ai_provider': 'OpenAI',
        'mongodb_connected': analyzer.mongodb.connected,
        'message': 'AI services are ready'
    })

@ai_bp.route('/ai/analyze/<rack_id>', methods=['GET'])
@jwt_required()
def analyze_rack(rack_id):
    """Analyze a single rack"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    result = analyzer.analyze_rack(rack_id)
    
    if 'error' in result:
        return jsonify(result), 404 if 'not found' in result['error'] else 500
    
    return jsonify(result)

@ai_bp.route('/ai/compare', methods=['POST'])
@jwt_required()
def compare_racks():
    """Compare two racks"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    data = request.get_json()
    rack_id1 = data.get('rack_id1')
    rack_id2 = data.get('rack_id2')
    
    if not rack_id1 or not rack_id2:
        return jsonify({'error': 'Both rack_id1 and rack_id2 are required'}), 400
    
    result = analyzer.compare_racks(rack_id1, rack_id2)
    
    if 'error' in result:
        return jsonify(result), 404 if 'not found' in result['error'] else 500
    
    return jsonify(result)

@ai_bp.route('/ai/suggest/<rack_id>', methods=['GET'])
@jwt_required()
def suggest_improvements(rack_id):
    """Suggest improvements for a rack"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    result = analyzer.suggest_improvements(rack_id)
    
    if 'error' in result:
        return jsonify(result), 404 if 'not found' in result['error'] else 500
    
    return jsonify(result)

@ai_bp.route('/ai/ask', methods=['POST'])
@jwt_required()
def ask_question():
    """Ask a question about racks"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    data = request.get_json()
    question = data.get('question')
    rack_ids = data.get('rack_ids', None)
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    result = analyzer.answer_question(question, rack_ids)
    
    if 'error' in result:
        return jsonify(result), 500
    
    return jsonify(result)

@ai_bp.route('/ai/generate-ideas/<rack_id>', methods=['GET'])
@jwt_required()
def generate_ideas(rack_id):
    """Generate ideas for similar racks"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    result = analyzer.generate_similar_rack_idea(rack_id)
    
    if 'error' in result:
        return jsonify(result), 404 if 'not found' in result['error'] else 500
    
    return jsonify(result)

@ai_bp.route('/ai/chat', methods=['POST'])
@jwt_required()
def chat():
    """Simple chat interface for rack-related questions"""
    analyzer, error = get_ai_analyzer()
    if error:
        return jsonify({'error': error}), 500
    
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    # Use the answer_question method for general chat
    result = analyzer.answer_question(message)
    
    if 'error' in result:
        return jsonify(result), 500
    
    return jsonify({
        'message': result.get('answer', 'I could not process your request.'),
        'racks_analyzed': result.get('racks_analyzed', 0)
    })
