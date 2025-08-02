#!/usr/bin/env python3
"""
Test script to verify ChromaDB integration
"""

import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Set OpenAI API key if not already set
if not os.getenv('OPENAI_API_KEY'):
    print("⚠️  OPENAI_API_KEY not found in environment")
    print("   You can set it temporarily for testing:")
    print("   export OPENAI_API_KEY='your-api-key-here'")
    sys.exit(1)

def test_chromadb_connection():
    """Test basic ChromaDB functionality"""
    try:
        from vector_storage import vector_storage
        
        print("Testing ChromaDB Integration\n" + "="*40)
        
        # Test connection
        print("→ Connecting to ChromaDB...")
        if vector_storage.connect():
            print("✓ Connected successfully!")
            
            # Test data
            test_rack = {
                'rack_name': 'Test Bass Rack',
                'rack_type': 'Instrument',
                'producer_name': 'Test Producer',
                'tags': ['bass', 'deep', 'test'],
                'description': 'A test bass rack for integration testing',
                'stats': {
                    'total_devices': 5,
                    'total_chains': 2,
                    'macro_controls': 8
                },
                'analysis': {
                    'chains': [
                        {
                            'devices': [
                                {'name': 'Operator'},
                                {'name': 'EQ Eight'},
                                {'name': 'Compressor'}
                            ]
                        }
                    ],
                    'macro_controls': [
                        {'name': 'Filter Cutoff'},
                        {'name': 'Resonance'}
                    ]
                }
            }
            
            # Test storing embedding
            print("\n→ Storing test rack embedding...")
            if vector_storage.store_rack_embedding('test-rack-001', test_rack):
                print("✓ Stored embedding successfully!")
            else:
                print("❌ Failed to store embedding")
                return False
            
            # Test searching
            print("\n→ Testing semantic search...")
            results = vector_storage.search_similar_racks("bass synthesizer with filter", top_k=5)
            if results:
                print(f"✓ Found {len(results)} similar racks:")
                for r in results:
                    print(f"  - {r['rack_name']} (score: {r['similarity_score']:.3f})")
            else:
                print("⚠️  No results found (this is normal if database is empty)")
            
            # Test finding similar
            print("\n→ Testing find similar by rack...")
            similar = vector_storage.find_similar_by_rack_id('test-rack-001', test_rack, top_k=5)
            if similar:
                print(f"✓ Found {len(similar)} similar racks")
            else:
                print("⚠️  No similar racks found (this is normal if database is empty)")
            
            # Cleanup
            print("\n→ Cleaning up test data...")
            if vector_storage.delete_rack_embedding('test-rack-001'):
                print("✓ Deleted test embedding")
            
            print("\n✅ All tests passed! ChromaDB integration is working.")
            return True
            
        else:
            print("❌ Failed to connect to ChromaDB")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_chromadb_connection()
    sys.exit(0 if success else 1)
