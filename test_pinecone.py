#!/usr/bin/env python3
"""Test Pinecone connection and available resources"""

import os
import pinecone

# Set up environment variables for testing
api_key = "pcsk_7ShPHR_FLL52VGgihkVbqkw3MkxXiiQgx2fd1yFYEi8HXsPA8qV6aFZhFVfDRSoKuHf8GL"
environment = "us-east-1-aws"

print("Testing Pinecone connection...")

try:
    # Initialize Pinecone
    pinecone.init(api_key=api_key, environment=environment)
    
    # List existing indexes
    indexes = pinecone.list_indexes()
    print(f"Existing indexes: {indexes}")
    
    # Try to get info about the environment
    print("\nAttempting to create index...")
    try:
        pinecone.create_index(
            name="test-index",
            dimension=8,  # Small dimension for testing
            metric='cosine',
            spec=pinecone.ServerlessSpec(
                cloud='aws',
                region='us-east-1'
            )
        )
        print("Successfully created test index!")
        
        # Clean up
        pinecone.delete_index("test-index")
        print("Deleted test index")
    except Exception as e:
        print(f"Failed to create index: {e}")
        
except Exception as e:
    print(f"Failed to connect to Pinecone: {e}")

print("\nDone!")
