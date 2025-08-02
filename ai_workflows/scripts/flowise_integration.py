#!/usr/bin/env python3
"""
FlowiseAI integration for Ableton rack data
Provides API endpoints and utilities for FlowiseAI workflows
"""

import json
import requests
from typing import Dict, List, Any, Optional
from pathlib import Path
import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import sys

# Add parent directory to import backend modules
sys.path.append(str(Path(__file__).parent.parent.parent / 'backend'))
from db import MongoDB


class FlowiseAIClient:
    """Client for interacting with FlowiseAI API"""
    
    def __init__(self, base_url: str = None, api_key: str = None):
        self.base_url = base_url or os.getenv("FLOWISE_API_URL", "http://localhost:3000")
        self.api_key = api_key or os.getenv("FLOWISE_API_KEY", "")
        self.headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
    
    def create_chatflow(self, name: str, description: str, nodes: List[Dict]) -> Dict:
        """Create a new chatflow in FlowiseAI"""
        payload = {
            "name": name,
            "description": description,
            "nodes": nodes,
            "edges": []
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/chatflows",
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def upload_document(self, file_path: str, metadata: Dict = None) -> Dict:
        """Upload a document to FlowiseAI for processing"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'metadata': json.dumps(metadata)} if metadata else {}
            
            response = requests.post(
                f"{self.base_url}/api/v1/documents",
                files=files,
                data=data,
                headers={"Authorization": self.headers.get("Authorization", "")}
            )
        
        response.raise_for_status()
        return response.json()
    
    def predict(self, chatflow_id: str, question: str, overrides: Dict = None) -> Dict:
        """Make a prediction using a chatflow"""
        payload = {
            "question": question,
            "overrideConfig": overrides or {}
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/prediction/{chatflow_id}",
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()


class RackDataFlowiseAdapter:
    """Adapter to integrate rack data with FlowiseAI workflows"""
    
    def __init__(self, flowise_client: FlowiseAIClient):
        self.client = flowise_client
        self.data_dir = Path("ai_workflows/data")
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def prepare_rack_data_for_flowise(self, rack_data: Dict) -> Dict:
        """Convert rack data to FlowiseAI-compatible format"""
        # Create a text representation for embeddings
        text_representation = f"""
        Rack Name: {rack_data.get('rack_name', 'Unknown')}
        Macros: {', '.join(rack_data.get('macro_names', []))}
        Chains: {', '.join(rack_data.get('chain_names', []))}
        Device Types: {', '.join(rack_data.get('device_types', []))}
        Total Devices: {rack_data.get('total_devices', 0)}
        """
        
        # Create metadata for filtering and searching
        metadata = {
            "rack_name": rack_data.get('rack_name', 'Unknown'),
            "num_macros": rack_data.get('num_macros', 0),
            "num_chains": rack_data.get('num_chains', 0),
            "total_devices": rack_data.get('total_devices', 0),
            "device_types": ','.join(rack_data.get('device_types', [])),
            "timestamp": rack_data.get('timestamp', datetime.now().isoformat())
        }
        
        return {
            "pageContent": text_representation.strip(),
            "metadata": metadata
        }
    
    def create_rack_analysis_chatflow(self) -> Dict:
        """Create a chatflow for rack analysis"""
        nodes = [
            {
                "id": "chatInput",
                "type": "chatInput",
                "data": {
                    "label": "Chat Input"
                }
            },
            {
                "id": "memory",
                "type": "memoryNode",
                "data": {
                    "label": "Buffer Memory",
                    "memoryKey": "chat_history",
                    "returnMessages": True
                }
            },
            {
                "id": "documentStore",
                "type": "documentStore",
                "data": {
                    "label": "Rack Data Store",
                    "embeddingModel": "text-embedding-ada-002",
                    "topK": 5
                }
            },
            {
                "id": "llmChain",
                "type": "llmChain",
                "data": {
                    "label": "Rack Analysis Chain",
                    "model": "gpt-3.5-turbo",
                    "temperature": 0.7,
                    "systemMessage": """You are an expert at analyzing Ableton Live racks. 
                    You can help users understand rack structures, suggest improvements, 
                    and identify patterns in rack configurations."""
                }
            },
            {
                "id": "chatOutput",
                "type": "chatOutput",
                "data": {
                    "label": "Chat Output"
                }
            }
        ]
        
        return self.client.create_chatflow(
            name="Ableton Rack Analyzer",
            description="Analyzes and provides insights on Ableton rack configurations",
            nodes=nodes
        )
    
    def upload_rack_dataset(self, dataset_path: str) -> List[Dict]:
        """Upload rack dataset to FlowiseAI"""
        with open(dataset_path, 'r') as f:
            dataset = json.load(f)
        
        results = []
        for rack_data in dataset.get('data', []):
            flowise_data = self.prepare_rack_data_for_flowise(rack_data)
            
            # Save as temporary file for upload
            temp_file = self.data_dir / f"rack_{rack_data.get('rack_name', 'unknown')}.json"
            with open(temp_file, 'w') as f:
                json.dump(flowise_data, f)
            
            try:
                result = self.client.upload_document(
                    str(temp_file),
                    metadata=flowise_data['metadata']
                )
                results.append(result)
            except Exception as e:
                print(f"Error uploading {temp_file}: {e}")
            finally:
                # Clean up temp file
                if temp_file.exists():
                    temp_file.unlink()
        
        return results
    
    def query_rack_insights(self, chatflow_id: str, query: str) -> str:
        """Query insights about racks"""
        response = self.client.predict(
            chatflow_id=chatflow_id,
            question=query,
            overrides={
                "returnSourceDocuments": True
            }
        )
        
        return response.get('text', '')


class MongoDBFlowiseAdapter(RackDataFlowiseAdapter):
    """MongoDB-backed adapter for FlowiseAI integration"""
    
    def __init__(self, flowise_client: FlowiseAIClient, mongodb: MongoDB = None):
        super().__init__(flowise_client)
        self.mongodb = mongodb or MongoDB()
        if not self.mongodb.connected:
            self.mongodb.connect()
    
    def sync_racks_to_flowise(self, limit: int = None) -> List[Dict]:
        """Sync racks from MongoDB to FlowiseAI"""
        print("Syncing racks from MongoDB to FlowiseAI...")
        
        # Get racks from MongoDB
        racks = self.mongodb.get_recent_racks(limit or 1000)
        print(f"[DEBUG] Retrieved {len(racks)} racks from MongoDB")
        results = []
        
        # Check if data directory exists
        if not self.data_dir.exists():
            print(f"[DEBUG] Creating data directory: {self.data_dir}")
            self.data_dir.mkdir(parents=True, exist_ok=True)
        
        for i, rack in enumerate(racks):
            print(f"[DEBUG] Processing rack {i+1}/{len(racks)}: {rack.get('rack_name', 'Unknown')}")
            
            try:
                # Convert MongoDB rack to FlowiseAI format
                rack_data = self._convert_mongodb_rack_to_features(rack)
                flowise_data = self.prepare_rack_data_for_flowise(rack_data)
                
                # Add MongoDB ID to metadata
                flowise_data['metadata']['mongodb_id'] = str(rack['_id'])
                
                # Save as temporary file for upload
                temp_file = self.data_dir / f"rack_{rack.get('rack_name', 'unknown')}_{rack['_id']}.json"
                print(f"[DEBUG] Writing temp file: {temp_file}")
                
                with open(temp_file, 'w') as f:
                    json.dump(flowise_data, f)
                
                print(f"[DEBUG] Uploading to FlowiseAI: {self.client.base_url}")
                result = self.client.upload_document(
                    str(temp_file),
                    metadata=flowise_data['metadata']
                )
                results.append(result)
                print(f"[SUCCESS] Uploaded rack: {rack.get('rack_name', 'Unknown')} (ID: {rack['_id']})")
            except Exception as e:
                print(f"[ERROR] Failed to upload rack {rack['_id']}: {e}")
                import traceback
                print(traceback.format_exc())
            finally:
                # Clean up temp file
                if temp_file.exists():
                    temp_file.unlink()
                    print(f"[DEBUG] Cleaned up temp file")
        
        print(f"[COMPLETE] Synced {len(results)} racks to FlowiseAI")
        return results
    
    def _convert_mongodb_rack_to_features(self, rack: Dict) -> Dict:
        """Convert MongoDB rack document to feature format"""
        analysis = rack.get('analysis', {})
        
        # Extract macro names
        macro_names = [m.get('name', '') for m in analysis.get('macro_controls', [])]
        macro_values = [m.get('value', 0) for m in analysis.get('macro_controls', [])]
        
        # Extract chain names and device info
        chain_names = []
        device_types = []
        device_type_counts = {}
        solo_chains = 0
        
        for chain in analysis.get('chains', []):
            chain_names.append(chain.get('name', ''))
            if chain.get('solo', False):
                solo_chains += 1
            
            for device in chain.get('devices', []):
                device_type = device.get('type', 'Unknown')
                device_types.append(device_type)
                device_type_counts[device_type] = device_type_counts.get(device_type, 0) + 1
        
        return {
            'rack_name': rack.get('rack_name', 'Unknown'),
            'num_macros': len(macro_names),
            'num_chains': len(chain_names),
            'total_devices': rack.get('stats', {}).get('total_devices', 0),
            'device_types': list(set(device_types)),
            'device_type_counts': device_type_counts,
            'macro_names': macro_names,
            'macro_values': macro_values,
            'chain_names': chain_names,
            'solo_chains': solo_chains,
            'producer_name': rack.get('producer_name', ''),
            'description': rack.get('description', ''),
            'tags': rack.get('tags', []),
            'download_count': rack.get('download_count', 0),
            'created_at': rack.get('created_at', datetime.utcnow()).isoformat(),
            'file_path': rack.get('filename', '')
        }
    
    def search_and_analyze(self, query: str, chatflow_id: str) -> Dict:
        """Search racks in MongoDB and analyze with FlowiseAI"""
        # Search in MongoDB
        racks = self.mongodb.search_racks(query)
        
        if not racks:
            return {
                'query': query,
                'results': [],
                'analysis': 'No racks found matching your query.'
            }
        
        # Prepare context for FlowiseAI
        context = f"Found {len(racks)} racks matching '{query}':\n\n"
        for i, rack in enumerate(racks[:5]):  # Limit to first 5 for context
            context += f"{i+1}. {rack.get('rack_name', 'Unknown')} - "
            context += f"{rack.get('stats', {}).get('total_devices', 0)} devices, "
            context += f"{rack.get('stats', {}).get('macro_controls', 0)} macros\n"
        
        # Get AI analysis
        analysis_query = f"Given these search results for '{query}':\n{context}\nProvide insights and recommendations."
        ai_response = self.query_rack_insights(chatflow_id, analysis_query)
        
        return {
            'query': query,
            'results': racks,
            'analysis': ai_response
        }


def main():
    """Example usage of FlowiseAI integration"""
    # Initialize client
    client = FlowiseAIClient()
    adapter = RackDataFlowiseAdapter(client)
    
    # Create a chatflow for rack analysis
    print("Creating rack analysis chatflow...")
    chatflow = adapter.create_rack_analysis_chatflow()
    print(f"Created chatflow: {chatflow['id']}")
    
    # Upload rack dataset
    dataset_path = "ai_workflows/data/rack_dataset.json"
    if Path(dataset_path).exists():
        print(f"Uploading rack dataset from {dataset_path}...")
        results = adapter.upload_rack_dataset(dataset_path)
        print(f"Uploaded {len(results)} rack documents")
    
    # Example queries
    example_queries = [
        "What are the most common macro names in the racks?",
        "Which racks have the most complex chain structures?",
        "Suggest improvements for racks with many devices",
        "Find racks that use similar device combinations"
    ]
    
    for query in example_queries:
        print(f"\nQuery: {query}")
        response = adapter.query_rack_insights(chatflow['id'], query)
        print(f"Response: {response}")


if __name__ == "__main__":
    main()
