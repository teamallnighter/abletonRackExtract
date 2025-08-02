"""
Vector storage integration for semantic search and recommendations
Using ChromaDB for vector database
"""

import os
import logging
from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings
from openai import OpenAI
import numpy as np

logger = logging.getLogger(__name__)

class VectorStorage:
    """Manages vector embeddings for rack analysis using ChromaDB"""
    
    def __init__(self):
        # Initialize ChromaDB settings
        self.persist_directory = os.getenv('CHROMA_PERSIST_DIRECTORY', './chroma_db')
        self.collection_name = os.getenv('CHROMA_COLLECTION_NAME', 'ableton_racks')
        
        # Initialize OpenAI for embeddings
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        self.client = None
        self.collection = None
        self.initialized = False
        
    def connect(self):
        """Initialize ChromaDB connection"""
        try:
            # Initialize ChromaDB client
            if self.persist_directory and self.persist_directory != ':memory:':
                # Persistent storage
                self.client = chromadb.PersistentClient(
                    path=self.persist_directory,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                logger.info(f"Using persistent ChromaDB at {self.persist_directory}")
            else:
                # In-memory storage (good for testing)
                self.client = chromadb.Client(
                    Settings(
                        is_persistent=False,
                        anonymized_telemetry=False
                    )
                )
                logger.info("Using in-memory ChromaDB")
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(
                    name=self.collection_name,
                    embedding_function=None  # We'll provide embeddings directly
                )
                logger.info(f"Connected to existing collection: {self.collection_name}")
            except:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"hnsw:space": "cosine"},
                    embedding_function=None  # We'll provide embeddings directly
                )
                logger.info(f"Created new collection: {self.collection_name}")
            
            self.initialized = True
            logger.info("Successfully connected to ChromaDB")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
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
        """Store rack embedding in ChromaDB"""
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
                'rack_name': rack.get('rack_name', 'Unknown'),
                'producer_name': rack.get('producer_name', 'Unknown'),
                'rack_type': rack.get('rack_type', 'Unknown'),
                'tags': ','.join(rack.get('tags', [])),
                'total_devices': rack.get('stats', {}).get('total_devices', 0),
                'total_chains': rack.get('stats', {}).get('total_chains', 0),
                'macro_controls': rack.get('stats', {}).get('macro_controls', 0),
                'embedding_text': embedding_text[:1000]  # Store partial text for reference
            }
            
            # Store in ChromaDB
            self.collection.upsert(
                ids=[rack_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[embedding_text]  # ChromaDB can also store the original text
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
            
            # Build where clause for filters
            where_clause = None
            if filters:
                # ChromaDB uses a different filter syntax
                # Example: filters = {"rack_type": "Instrument"}
                where_clause = filters
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause
            )
            
            # Format results
            similar_racks = []
            if results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    metadata = results['metadatas'][0][i]
                    similar_racks.append({
                        'rack_id': results['ids'][0][i],
                        'rack_name': metadata.get('rack_name', 'Unknown'),
                        'producer_name': metadata.get('producer_name', 'Unknown'),
                        'rack_type': metadata.get('rack_type', 'Unknown'),
                        'tags': metadata.get('tags', '').split(',') if metadata.get('tags') else [],
                        'similarity_score': 1 - results['distances'][0][i],  # Convert distance to similarity
                        'stats': {
                            'total_devices': metadata.get('total_devices', 0),
                            'total_chains': metadata.get('total_chains', 0),
                            'macro_controls': metadata.get('macro_controls', 0)
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
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k + 1  # Get one extra to exclude self
            )
            
            # Format results, excluding the query rack itself
            similar_racks = []
            if results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    if results['ids'][0][i] != rack_id:
                        metadata = results['metadatas'][0][i]
                        similar_racks.append({
                            'rack_id': results['ids'][0][i],
                            'rack_name': metadata.get('rack_name', 'Unknown'),
                            'producer_name': metadata.get('producer_name', 'Unknown'),
                            'rack_type': metadata.get('rack_type', 'Unknown'),
                            'tags': metadata.get('tags', '').split(',') if metadata.get('tags') else [],
                            'similarity_score': 1 - results['distances'][0][i],  # Convert distance to similarity
                            'stats': {
                                'total_devices': metadata.get('total_devices', 0),
                                'total_chains': metadata.get('total_chains', 0),
                                'macro_controls': metadata.get('macro_controls', 0)
                            }
                        })
            
            return similar_racks[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to find similar racks: {e}")
            return []
    
    def delete_rack_embedding(self, rack_id: str) -> bool:
        """Delete a rack embedding from ChromaDB"""
        if not self.initialized:
            if not self.connect():
                return False
        
        try:
            self.collection.delete(ids=[rack_id])
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
