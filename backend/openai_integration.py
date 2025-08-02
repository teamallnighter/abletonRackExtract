"""
OpenAI integration for Ableton rack analysis
Direct integration without complex workflow systems
"""

import os
import json
from typing import Dict, List, Optional
from openai import OpenAI
from db import MongoDB

class RackAIAnalyzer:
    """Simple AI analyzer for Ableton racks using OpenAI"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.mongodb = MongoDB()
        self.mongodb.connect()
    
    def analyze_rack(self, rack_id: str) -> Dict:
        """Analyze a single rack and provide insights"""
        rack = self.mongodb.get_rack_analysis(rack_id)
        if not rack:
            return {"error": "Rack not found"}
        
        # Create a detailed context about the rack
        context = self._create_rack_context(rack)
        
        # Ask OpenAI for analysis
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert Ableton Live rack analyzer. 
                        Provide detailed insights about rack structure, device choices, 
                        macro mappings, and suggestions for improvement."""
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this Ableton rack:\n\n{context}"
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return {
                "rack_id": rack_id,
                "rack_name": rack.get('rack_name', 'Unknown'),
                "analysis": response.choices[0].message.content,
                "stats": rack.get('stats', {})
            }
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    def compare_racks(self, rack_id1: str, rack_id2: str) -> Dict:
        """Compare two racks and identify differences"""
        rack1 = self.mongodb.get_rack_analysis(rack_id1)
        rack2 = self.mongodb.get_rack_analysis(rack_id2)
        
        if not rack1 or not rack2:
            return {"error": "One or both racks not found"}
        
        context = f"""Compare these two Ableton racks:

Rack 1: {self._create_rack_context(rack1)}

Rack 2: {self._create_rack_context(rack2)}

Highlight key differences in structure, device choices, and macro mappings."""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at comparing Ableton Live racks."
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                temperature=0.7,
                max_tokens=600
            )
            
            return {
                "rack1": {"id": rack_id1, "name": rack1.get('rack_name')},
                "rack2": {"id": rack_id2, "name": rack2.get('rack_name')},
                "comparison": response.choices[0].message.content
            }
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    def suggest_improvements(self, rack_id: str) -> Dict:
        """Suggest improvements for a rack"""
        rack = self.mongodb.get_rack_analysis(rack_id)
        if not rack:
            return {"error": "Rack not found"}
        
        context = self._create_rack_context(rack)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert Ableton Live producer. 
                        Suggest specific improvements for racks including:
                        - Better device ordering
                        - Missing effects that could enhance the sound
                        - Macro mapping improvements
                        - CPU optimization tips"""
                    },
                    {
                        "role": "user",
                        "content": f"Suggest improvements for this rack:\n\n{context}"
                    }
                ],
                temperature=0.8,
                max_tokens=600
            )
            
            return {
                "rack_id": rack_id,
                "rack_name": rack.get('rack_name', 'Unknown'),
                "suggestions": response.choices[0].message.content
            }
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    def answer_question(self, question: str, rack_ids: List[str] = None) -> Dict:
        """Answer a question about racks"""
        if rack_ids:
            # Get specific racks
            racks = [self.mongodb.get_rack_analysis(rid) for rid in rack_ids]
            racks = [r for r in racks if r]  # Filter out None values
        else:
            # Get all recent racks
            racks = self.mongodb.get_recent_racks(10)
        
        if not racks:
            return {"error": "No racks found"}
        
        # Create context from all racks
        context = "Available racks:\n\n"
        for i, rack in enumerate(racks, 1):
            context += f"{i}. {self._create_rack_summary(rack)}\n\n"
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing Ableton Live racks. Answer questions based on the provided rack data."
                    },
                    {
                        "role": "user",
                        "content": f"{context}\n\nQuestion: {question}"
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return {
                "question": question,
                "answer": response.choices[0].message.content,
                "racks_analyzed": len(racks)
            }
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    def generate_similar_rack_idea(self, rack_id: str) -> Dict:
        """Generate ideas for similar racks"""
        rack = self.mongodb.get_rack_analysis(rack_id)
        if not rack:
            return {"error": "Rack not found"}
        
        context = self._create_rack_context(rack)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a creative Ableton Live producer. 
                        Generate ideas for new racks based on existing ones.
                        Include specific device suggestions and macro mappings."""
                    },
                    {
                        "role": "user",
                        "content": f"""Based on this rack, suggest 3 variations or similar rack ideas:
                        
{context}

For each idea, specify:
1. Rack name and purpose
2. Key devices to include
3. Suggested macro mappings
4. What makes it different/unique"""
                    }
                ],
                temperature=0.9,
                max_tokens=800
            )
            
            return {
                "original_rack": rack.get('rack_name', 'Unknown'),
                "ideas": response.choices[0].message.content
            }
        except Exception as e:
            return {"error": f"OpenAI API error: {str(e)}"}
    
    def _create_rack_context(self, rack: Dict) -> str:
        """Create a detailed text representation of a rack"""
        analysis = rack.get('analysis', {})
        
        context = f"""
Rack Name: {rack.get('rack_name', 'Unknown')}
Producer: {rack.get('producer_name', 'Unknown')}
Created: {rack.get('created_at', 'Unknown')}

Statistics:
- Total Chains: {rack.get('stats', {}).get('total_chains', 0)}
- Total Devices: {rack.get('stats', {}).get('total_devices', 0)}
- Macro Controls: {rack.get('stats', {}).get('macro_controls', 0)}

Macro Controls:
"""
        
        for macro in analysis.get('macro_controls', []):
            if macro.get('name'):
                context += f"- Macro {macro.get('index', '?')}: {macro.get('name')} (Value: {macro.get('value', 0)})\n"
        
        context += "\nChains:\n"
        for chain in analysis.get('chains', []):
            context += f"\nChain: {chain.get('name', 'Unnamed')}\n"
            context += f"Devices:\n"
            for device in chain.get('devices', []):
                context += f"  - {device.get('name', 'Unknown')} ({device.get('type', 'Unknown')})"
                context += f" {'[ON]' if device.get('is_on', True) else '[OFF]'}\n"
        
        return context
    
    def _create_rack_summary(self, rack: Dict) -> str:
        """Create a brief summary of a rack"""
        return (f"{rack.get('rack_name', 'Unknown')} - "
                f"{rack.get('stats', {}).get('total_devices', 0)} devices, "
                f"{rack.get('stats', {}).get('macro_controls', 0)} macros")
