"""
Semantic search routes for Ableton Rack Analyzer
Using vector embeddings for intelligent search and recommendations
"""

from flask import Blueprint, request, jsonify
from vector_storage import vector_storage
from db import db
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
semantic_bp = Blueprint('semantic', __name__)

@semantic_bp.route('/search/semantic', methods=['POST'])
def semantic_search():
    """Search for racks using natural language queries"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        limit = data.get('limit', 10)
        filters = data.get('filters', {})
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        # Convert filters to Pinecone format if needed
        pinecone_filters = {}
        if filters.get('rack_type'):
            pinecone_filters['rack_type'] = filters['rack_type']
        if filters.get('producer_name'):
            pinecone_filters['producer_name'] = filters['producer_name']
        
        # Perform semantic search
        results = vector_storage.search_similar_racks(
            query_text=query,
            top_k=limit,
            filters=pinecone_filters if pinecone_filters else None
        )
        
        # Get full rack data for each result
        enriched_results = []
        for result in results:
            rack = db.get_rack_analysis(result['rack_id'])
            if rack:
                # Add similarity score to rack data
                rack['similarity_score'] = result['similarity_score']
                enriched_results.append(rack)
        
        return jsonify({
            'success': True,
            'racks': enriched_results,
            'count': len(enriched_results),
            'query': query
        }), 200
        
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return jsonify({'error': f'Semantic search failed: {str(e)}'}), 500

@semantic_bp.route('/racks/<rack_id>/similar', methods=['GET'])
def find_similar_racks(rack_id):
    """Find racks similar to a given rack"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        # Get the rack data
        rack = db.get_rack_analysis(rack_id)
        if not rack:
            return jsonify({'error': 'Rack not found'}), 404
        
        # Find similar racks
        similar = vector_storage.find_similar_by_rack_id(rack_id, rack, top_k=limit)
        
        # Get full rack data for each result
        enriched_results = []
        for result in similar:
            similar_rack = db.get_rack_analysis(result['rack_id'])
            if similar_rack:
                # Add similarity score to rack data
                similar_rack['similarity_score'] = result['similarity_score']
                enriched_results.append(similar_rack)
        
        return jsonify({
            'success': True,
            'original_rack': {
                '_id': rack_id,
                'rack_name': rack.get('rack_name', 'Unknown')
            },
            'similar_racks': enriched_results,
            'count': len(enriched_results)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to find similar racks: {e}")
        return jsonify({'error': f'Failed to find similar racks: {str(e)}'}), 500

@semantic_bp.route('/search/by-description', methods=['POST'])
def search_by_description():
    """Search for racks by describing desired characteristics"""
    try:
        data = request.get_json()
        description = data.get('description', '')
        limit = data.get('limit', 10)
        
        if not description:
            return jsonify({'error': 'Description required'}), 400
        
        # Create a more detailed query from the description
        query = f"Find racks that: {description}"
        
        # Perform semantic search
        results = vector_storage.search_similar_racks(
            query_text=query,
            top_k=limit
        )
        
        # Get full rack data for each result
        enriched_results = []
        for result in results:
            rack = db.get_rack_analysis(result['rack_id'])
            if rack:
                # Add similarity score to rack data
                rack['similarity_score'] = result['similarity_score']
                enriched_results.append(rack)
        
        return jsonify({
            'success': True,
            'racks': enriched_results,
            'count': len(enriched_results),
            'description': description
        }), 200
        
    except Exception as e:
        logger.error(f"Search by description failed: {e}")
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@semantic_bp.route('/recommend/by-style', methods=['POST'])
def recommend_by_style():
    """Recommend racks based on production style or genre"""
    try:
        data = request.get_json()
        style = data.get('style', '')
        genre = data.get('genre', '')
        characteristics = data.get('characteristics', [])
        limit = data.get('limit', 10)
        
        if not style and not genre:
            return jsonify({'error': 'Either style or genre required'}), 400
        
        # Build query from inputs
        query_parts = []
        if style:
            query_parts.append(f"production style: {style}")
        if genre:
            query_parts.append(f"genre: {genre}")
        if characteristics:
            query_parts.append(f"characteristics: {', '.join(characteristics)}")
        
        query = " | ".join(query_parts)
        
        # Perform semantic search
        results = vector_storage.search_similar_racks(
            query_text=query,
            top_k=limit
        )
        
        # Get full rack data for each result
        enriched_results = []
        for result in results:
            rack = db.get_rack_analysis(result['rack_id'])
            if rack:
                # Add similarity score to rack data
                rack['similarity_score'] = result['similarity_score']
                enriched_results.append(rack)
        
        return jsonify({
            'success': True,
            'recommendations': enriched_results,
            'count': len(enriched_results),
            'style': style,
            'genre': genre,
            'characteristics': characteristics
        }), 200
        
    except Exception as e:
        logger.error(f"Style recommendation failed: {e}")
        return jsonify({'error': f'Recommendation failed: {str(e)}'}), 500

@semantic_bp.route('/analyze/rack-similarity', methods=['POST'])
def analyze_rack_similarity():
    """Analyze similarity between two specific racks"""
    try:
        data = request.get_json()
        rack_id1 = data.get('rack_id1')
        rack_id2 = data.get('rack_id2')
        
        if not rack_id1 or not rack_id2:
            return jsonify({'error': 'Both rack_id1 and rack_id2 are required'}), 400
        
        # Get both racks
        rack1 = db.get_rack_analysis(rack_id1)
        rack2 = db.get_rack_analysis(rack_id2)
        
        if not rack1 or not rack2:
            return jsonify({'error': 'One or both racks not found'}), 404
        
        # Generate embeddings for both
        embedding1 = vector_storage.generate_embedding(
            vector_storage.create_rack_embedding_text(rack1)
        )
        embedding2 = vector_storage.generate_embedding(
            vector_storage.create_rack_embedding_text(rack2)
        )
        
        if not embedding1 or not embedding2:
            return jsonify({'error': 'Failed to generate embeddings'}), 500
        
        # Calculate cosine similarity
        import numpy as np
        similarity = np.dot(embedding1, embedding2) / (
            np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        )
        
        # Prepare comparison data
        comparison = {
            'similarity_score': float(similarity),
            'similarity_percentage': round(float(similarity) * 100, 2),
            'rack1': {
                '_id': rack_id1,
                'rack_name': rack1.get('rack_name', 'Unknown'),
                'stats': rack1.get('stats', {})
            },
            'rack2': {
                '_id': rack_id2,
                'rack_name': rack2.get('rack_name', 'Unknown'),
                'stats': rack2.get('stats', {})
            },
            'interpretation': interpret_similarity(similarity)
        }
        
        return jsonify({
            'success': True,
            'comparison': comparison
        }), 200
        
    except Exception as e:
        logger.error(f"Rack similarity analysis failed: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

def interpret_similarity(score):
    """Interpret similarity score for users"""
    if score >= 0.9:
        return "Nearly identical - These racks are extremely similar"
    elif score >= 0.7:
        return "Very similar - These racks share many characteristics"
    elif score >= 0.5:
        return "Moderately similar - These racks have some common elements"
    elif score >= 0.3:
        return "Somewhat similar - These racks share a few characteristics"
    else:
        return "Different - These racks are quite different from each other"
