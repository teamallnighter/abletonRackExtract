"""
Vector storage integration for semantic search and recommendations
Using Pinecone for vector database
"""

import os
import logging
from typing import List, Dict, Optional
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
import numpy as np

logger = logging.getLogger(__name__)

class VectorStorage:
    """Manages vector embeddings for rack analysis using Pinecone"""
    
    def __init__(self):
        # Initialize Pinecone
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.pinecone_environment = os.getenv('PINECONE_ENVIRONMENT', 'us-east-1-aws')
        self.index_name = os.getenv('PINECONE_INDEX_NAME', 'ableton-racks')
        
        # Initialize OpenAI for embeddings
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        self.index = None
        self.initialized = False
        
    def connect(self):
        """Initialize Pinecone connection"""
        if not self.pinecone_api_key:
            logger.error("Pinecone API key not found in environment variables")
            return False
            
        try:
            # Initialize Pinecone
            pc = Pinecone(api_key=self.pinecone_api_key)
            
            # Check if index exists
            existing_indexes = pc.list_indexes().names()
            if self.index_name not in existing_indexes:
                logger.info(f"Creating Pinecone index: {self.index_name}")
                try:
                    pc.create_index(
                        name=self.index_name,
                        dimension=1536,  # OpenAI embedding dimension
                        metric='cosine',
                        spec=ServerlessSpec(
                            cloud='aws',
                            region='us-east-1'
                        )
                    )
                except Exception as create_error:
                    logger.error(f"Failed to create index: {create_error}")
                    # If we can't create, try to use the first available index
                    if existing_indexes:
                        self.index_name = existing_indexes[0]
                        logger.info(f"Using existing index: {self.index_name}")
                    else:
                        raise
            
            # Connect to index
            self.index = pc.Index(self.index_name)
            self.initialized = True
            logger.info("Successfully connected to Pinecone")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone: {e}")
            return False
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI"""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    def create_rack_embedding_text(self, rack: Dict) -> str:
        """Create text representation of rack for embedding"""
        analysis = rack.get('analysis', {})
        
        # Combine relevant information for embedding
        text_parts = [
            f"Rack: {rack.get('rack_name', 'Unknown')}",
            f"Type: {rack.get('rack_type', 'Unknown')}",
            f"Description: {rack.get('description', '')}",
            f"Producer: {rack.get('producer_name', 'Unknown')}",
            f"Tags: {', '.join(rack.get('tags', []))}",
            f"Chains: {rack.get('stats', {}).get('total_chains', 0)}",
            f"Devices: {rack.get('stats', {}).get('total_devices', 0)}",
            f"Macros: {rack.get('stats', {}).get('macro_controls', 0)}"
        ]
        
        # Add device names
        device_names = []
        for chain in analysis.get('chains', []):
            for device in chain.get('devices', []):
                device_names.append(device.get('name', ''))
        
        if device_names:
            text_parts.append(f"Devices: {', '.join(device_names)}")
        
        # Add macro names
        macro_names = [m.get('name', '') for m in analysis.get('macro_controls', []) if m.get('name')]
        if macro_names:
            text_parts.append(f"Macros: {', '.join(macro_names)}")
        
        # Add AI analysis if available
        if rack.get('ai_analysis'):
            ai_text = rack['ai_analysis'].get('analysis', '')
            if ai_text:
                text_parts.append(f"Analysis: {ai_text[:500]}")  # Limit length
        
        return " | ".join(text_parts)
    
    def store_rack_embedding(self, rack_id: str, rack: Dict) -> bool:
        """Store rack embedding in Pinecone"""
        if not self.initialized:
            if not self.connect():
                return False
        
        try:
            # Generate embedding text
            embedding_text = self.create_rack_embedding_text(rack)
            
            # Generate embedding
            embedding = self.generate_embedding(embedding_text)
            if not embedding:
                return False
            
            # Prepare metadata
            metadata = {
                'rack_id': rack_id,
                'rack_name': rack.get('rack_name', 'Unknown'),
                'producer_name': rack.get('producer_name', 'Unknown'),
                'rack_type': rack.get('rack_type', 'Unknown'),
                'tags': ','.join(rack.get('tags', [])),
                'total_devices': rack.get('stats', {}).get('total_devices', 0),
                'total_chains': rack.get('stats', {}).get('total_chains', 0),
                'macro_controls': rack.get('stats', {}).get('macro_controls', 0)
            }
            
            # Store in Pinecone
            self.index.upsert(
                vectors=[(rack_id, embedding, metadata)]
            )
            
            logger.info(f"Stored embedding for rack {rack_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store rack embedding: {e}")
            return False
    
    def search_similar_racks(self, query_text: str, top_k: int = 10, filters: Dict = None) -> List[Dict]:
        """Search for similar racks using semantic search"""
        if not self.initialized:
            if not self.connect():
                return []
        
        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query_text)
            if not query_embedding:
                return []
            
            # Search in Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filters
            )
            
            # Format results
            similar_racks = []
            for match in results.matches:
                similar_racks.append({
                    'rack_id': match.metadata['rack_id'],
                    'rack_name': match.metadata['rack_name'],
                    'producer_name': match.metadata['producer_name'],
                    'rack_type': match.metadata['rack_type'],
                    'tags': match.metadata['tags'].split(',') if match.metadata['tags'] else [],
                    'similarity_score': match.score,
                    'stats': {
                        'total_devices': match.metadata['total_devices'],
                        'total_chains': match.metadata['total_chains'],
                        'macro_controls': match.metadata['macro_controls']
                    }
                })
            
            return similar_racks
            
        except Exception as e:
            logger.error(f"Failed to search similar racks: {e}")
            return []
    
    def find_similar_by_rack_id(self, rack_id: str, rack: Dict, top_k: int = 10) -> List[Dict]:
        """Find racks similar to a given rack"""
        if not self.initialized:
            if not self.connect():
                return []
        
        try:
            # Generate embedding for the rack
            embedding_text = self.create_rack_embedding_text(rack)
            query_embedding = self.generate_embedding(embedding_text)
            if not query_embedding:
                return []
            
            # Search for similar racks (excluding the current rack)
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k + 1,  # Get one extra to exclude self
                include_metadata=True
            )
            
            # Format results, excluding the query rack itself
            similar_racks = []
            for match in results.matches:
                if match.metadata['rack_id'] != rack_id:
                    similar_racks.append({
                        'rack_id': match.metadata['rack_id'],
                        'rack_name': match.metadata['rack_name'],
                        'producer_name': match.metadata['producer_name'],
                        'rack_type': match.metadata['rack_type'],
                        'tags': match.metadata['tags'].split(',') if match.metadata['tags'] else [],
                        'similarity_score': match.score,
                        'stats': {
                            'total_devices': match.metadata['total_devices'],
                            'total_chains': match.metadata['total_chains'],
                            'macro_controls': match.metadata['macro_controls']
                        }
                    })
            
            return similar_racks[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to find similar racks: {e}")
            return []
    
    def delete_rack_embedding(self, rack_id: str) -> bool:
        """Delete a rack embedding from Pinecone"""
        if not self.initialized:
            if not self.connect():
                return False
        
        try:
            self.index.delete(ids=[rack_id])
            logger.info(f"Deleted embedding for rack {rack_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete rack embedding: {e}")
            return False
    
    def update_rack_embedding(self, rack_id: str, rack: Dict) -> bool:
        """Update rack embedding (delete and re-insert)"""
        # Pinecone doesn't support direct updates, so we delete and re-insert
        self.delete_rack_embedding(rack_id)
        return self.store_rack_embedding(rack_id, rack)

# Create global instance
vector_storage = VectorStorage()
