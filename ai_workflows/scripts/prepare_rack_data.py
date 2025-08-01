#!/usr/bin/env python3
"""
Prepare Ableton rack data for AI workflows in FlowiseAI
Converts rack analyzer output to training-ready format
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
import numpy as np
from datetime import datetime

# Add parent directory to path to import rack_analyzer
sys.path.append(str(Path(__file__).parent.parent.parent))

try:
    from rack_analyzer import RackAnalyzer
except ImportError:
    print("Error: Could not import RackAnalyzer. Make sure rack_analyzer.py is in the project root.")
    sys.exit(1)


class RackDataProcessor:
    """Process rack data for AI training"""
    
    def __init__(self, output_dir: str = "ai_workflows/data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.analyzer = RackAnalyzer()
    
    def extract_features(self, rack_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from rack data for training"""
        features = {
            "rack_name": rack_data.get("rack_name", "Unknown"),
            "num_macros": len(rack_data.get("macro_controls", [])),
            "num_chains": len(rack_data.get("chains", [])),
            "total_devices": sum(len(chain.get("devices", [])) for chain in rack_data.get("chains", [])),
            "device_types": [],
            "macro_names": [],
            "macro_values": [],
            "chain_names": [],
            "solo_chains": 0,
            "timestamp": datetime.now().isoformat()
        }
        
        # Extract macro information
        for macro in rack_data.get("macro_controls", []):
            features["macro_names"].append(macro.get("name", ""))
            features["macro_values"].append(macro.get("value", 0))
        
        # Extract chain and device information
        device_type_count = {}
        for chain in rack_data.get("chains", []):
            features["chain_names"].append(chain.get("name", ""))
            if chain.get("solo", False):
                features["solo_chains"] += 1
            
            for device in chain.get("devices", []):
                device_type = device.get("type", "Unknown")
                device_type_count[device_type] = device_type_count.get(device_type, 0) + 1
        
        features["device_types"] = list(device_type_count.keys())
        features["device_type_counts"] = device_type_count
        
        return features
    
    def process_rack_file(self, rack_path: str) -> Dict[str, Any]:
        """Process a single rack file"""
        try:
            # Analyze the rack
            rack_data = self.analyzer.analyze_rack(rack_path)
            
            # Extract features
            features = self.extract_features(rack_data)
            
            # Add raw data for reference
            features["raw_data"] = rack_data
            features["file_path"] = rack_path
            
            return {
                "success": True,
                "data": features
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "file_path": rack_path
            }
    
    def process_directory(self, input_dir: str, output_file: str = "rack_dataset.json"):
        """Process all rack files in a directory"""
        input_path = Path(input_dir)
        results = []
        errors = []
        
        # Find all .adg and .adv files
        rack_files = list(input_path.glob("**/*.adg")) + list(input_path.glob("**/*.adv"))
        
        print(f"Found {len(rack_files)} rack files to process")
        
        for i, rack_file in enumerate(rack_files):
            print(f"Processing {i+1}/{len(rack_files)}: {rack_file.name}")
            result = self.process_rack_file(str(rack_file))
            
            if result["success"]:
                results.append(result["data"])
            else:
                errors.append(result)
        
        # Save results
        output_path = self.output_dir / output_file
        with open(output_path, 'w') as f:
            json.dump({
                "metadata": {
                    "total_racks": len(rack_files),
                    "successful": len(results),
                    "failed": len(errors),
                    "processed_at": datetime.now().isoformat()
                },
                "data": results,
                "errors": errors
            }, f, indent=2)
        
        print(f"\nProcessing complete!")
        print(f"Successful: {len(results)}")
        print(f"Failed: {len(errors)}")
        print(f"Output saved to: {output_path}")
        
        return output_path
    
    def create_training_splits(self, dataset_file: str, train_ratio: float = 0.8):
        """Split dataset into training and validation sets"""
        with open(dataset_file, 'r') as f:
            dataset = json.load(f)
        
        data = dataset["data"]
        np.random.shuffle(data)
        
        split_idx = int(len(data) * train_ratio)
        train_data = data[:split_idx]
        val_data = data[split_idx:]
        
        # Save splits
        train_path = self.output_dir / "train_data.json"
        val_path = self.output_dir / "val_data.json"
        
        with open(train_path, 'w') as f:
            json.dump(train_data, f, indent=2)
        
        with open(val_path, 'w') as f:
            json.dump(val_data, f, indent=2)
        
        print(f"Created training split: {len(train_data)} samples -> {train_path}")
        print(f"Created validation split: {len(val_data)} samples -> {val_path}")
        
        return train_path, val_path


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Prepare rack data for AI workflows")
    parser.add_argument("input_dir", help="Directory containing rack files")
    parser.add_argument("--output-dir", default="ai_workflows/data", help="Output directory")
    parser.add_argument("--split", action="store_true", help="Create train/val splits")
    parser.add_argument("--train-ratio", type=float, default=0.8, help="Training data ratio")
    
    args = parser.parse_args()
    
    processor = RackDataProcessor(args.output_dir)
    
    # Process all racks
    dataset_path = processor.process_directory(args.input_dir)
    
    # Create splits if requested
    if args.split:
        processor.create_training_splits(dataset_path, args.train_ratio)


if __name__ == "__main__":
    main()
