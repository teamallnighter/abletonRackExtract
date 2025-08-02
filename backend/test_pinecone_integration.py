#!/usr/bin/env python3
"""
Test script to verify Pinecone integration with serverless setup
"""

import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

def test_pinecone_connection():
    """Test basic Pinecone connection and index creation"""
    api_key = os.getenv('PINECONE_API_KEY')
    index_name = os.getenv('PINECONE_INDEX_NAME', 'ableton-racks')
    
    if not api_key:
        print("❌ PINECONE_API_KEY not found in environment")
        return False
    
    print(f"✓ Found PINECONE_API_KEY")
    
    try:
        # Initialize Pinecone client
        pc = Pinecone(api_key=api_key)
        print("✓ Initialized Pinecone client")
        
        # List existing indexes
        existing_indexes = pc.list_indexes().names()
        print(f"✓ Existing indexes: {existing_indexes}")
        
        # Check if our index exists
        if index_name in existing_indexes:
            print(f"✓ Index '{index_name}' already exists")
            index = pc.Index(index_name)
            stats = index.describe_index_stats()
            print(f"  - Vectors: {stats.total_vector_count}")
            print(f"  - Dimension: {stats.dimension}")
        else:
            print(f"→ Creating new serverless index '{index_name}'...")
            pc.create_index(
                name=index_name,
                dimension=1536,  # OpenAI embedding dimension
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )
            print(f"✓ Created serverless index '{index_name}'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_vector_storage():
    """Test the vector storage module"""
    try:
        from vector_storage import vector_storage
        
        print("\n→ Testing vector storage connection...")
        if vector_storage.connect():
            print("✓ Vector storage connected successfully")
            return True
        else:
            print("❌ Failed to connect vector storage")
            return False
    except Exception as e:
        print(f"❌ Error testing vector storage: {e}")
        return False

if __name__ == "__main__":
    print("Testing Pinecone Integration\n" + "="*40)
    
    # Test basic connection
    if test_pinecone_connection():
        print("\n✓ Basic Pinecone connection successful!")
        
        # Test vector storage module
        if test_vector_storage():
            print("\n✅ All tests passed! Pinecone integration is ready.")
        else:
            print("\n⚠️  Vector storage module needs attention.")
    else:
        print("\n❌ Pinecone connection failed. Check your API key and configuration.")
