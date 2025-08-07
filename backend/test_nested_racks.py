#!/usr/bin/env python3
"""
Test script to verify nested rack parsing improvements
"""
import os
import json
from abletonRackAnalyzer import decompress_and_parse_ableton_file, parse_chains_and_devices

def count_nested_devices(chains, depth=0):
    """Recursively count all devices including nested ones"""
    total = 0
    indent = "  " * depth
    
    for i, chain in enumerate(chains):
        chain_name = chain.get('name', f'Chain {i+1}')
        devices = chain.get('devices', [])
        print(f"{indent}Chain '{chain_name}': {len(devices)} direct devices")
        
        for j, device in enumerate(devices):
            device_name = device.get('name', 'Unknown')
            device_type = device.get('type', 'Unknown')
            nested_chains = device.get('chains', [])
            
            if nested_chains:
                print(f"{indent}  Device '{device_name}' ({device_type}) contains {len(nested_chains)} nested chains:")
                nested_count = count_nested_devices(nested_chains, depth + 2)
                total += nested_count
            else:
                print(f"{indent}  Device '{device_name}' ({device_type})")
                total += 1
    
    return total

def test_rack_file(filepath, verbose=True):
    """Test parsing a specific rack file"""
    print(f"\n{'='*60}")
    print(f"Testing: {os.path.basename(filepath)}")
    print(f"{'='*60}")
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return False
    
    try:
        # Parse the file
        xml_root = decompress_and_parse_ableton_file(filepath)
        if xml_root is None:
            print("❌ Failed to decompress/parse file")
            return False
        
        # Analyze with verbose output
        rack_info = parse_chains_and_devices(xml_root, filepath, verbose=verbose)
        if rack_info is None:
            print("❌ Failed to analyze rack structure")
            return False
        
        # Print summary
        print(f"\n📊 ANALYSIS SUMMARY:")
        print(f"Rack Name: {rack_info.get('rack_name', 'Unknown')}")
        print(f"Rack Type: {rack_info.get('rack_type', 'Unknown')}")
        print(f"Total Chains: {len(rack_info.get('chains', []))}")
        print(f"Macro Controls: {len(rack_info.get('macro_controls', []))}")
        
        # Count all devices (including nested)
        total_devices = count_nested_devices(rack_info.get('chains', []))
        print(f"Total Devices (including nested): {total_devices}")
        
        # Show any parsing errors/warnings
        if 'parsing_errors' in rack_info:
            print(f"\n⚠️  Parsing Errors:")
            for error in rack_info['parsing_errors']:
                print(f"  - {error}")
        
        if 'parsing_warnings' in rack_info:
            print(f"\n⚠️  Parsing Warnings:")
            for warning in rack_info['parsing_warnings']:
                print(f"  - {warning}")
        
        # Export detailed analysis
        output_file = f"{os.path.splitext(filepath)[0]}_analysis_detailed.json"
        with open(output_file, 'w') as f:
            json.dump(rack_info, f, indent=2)
        print(f"\n📄 Detailed analysis saved to: {output_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing file: {e}")
        return False

def main():
    """Main test function"""
    print("🔧 Testing Nested Rack Parsing Improvements")
    print("This script will test the enhanced analyzer with any .adg/.adv files found")
    
    # Look for test files in common locations
    test_locations = [
        ".",
        "..",
        "test_files",
        "../test_files",
        os.path.expanduser("~/Desktop"),
        os.path.expanduser("~/Downloads")
    ]
    
    rack_files = []
    for location in test_locations:
        if os.path.exists(location):
            for file in os.listdir(location):
                if file.lower().endswith(('.adg', '.adv')):
                    rack_files.append(os.path.join(location, file))
    
    if not rack_files:
        print("\n❓ No .adg or .adv files found for testing.")
        print("To test the fix:")
        print("1. Place some Ableton rack files (.adg) in the current directory")
        print("2. Run this script again")
        print("3. Check the detailed analysis output for nested chains")
        return
    
    print(f"\n🎯 Found {len(rack_files)} rack file(s) to test:")
    for filepath in rack_files:
        print(f"  - {os.path.basename(filepath)}")
    
    # Test each file
    successful_tests = 0
    for filepath in rack_files:
        if test_rack_file(filepath, verbose=True):
            successful_tests += 1
    
    print(f"\n✅ Successfully tested {successful_tests}/{len(rack_files)} files")
    
    if successful_tests > 0:
        print("\n🔍 To verify the fix worked:")
        print("1. Check the detailed analysis JSON files")
        print("2. Look for 'chains' arrays within device objects")
        print("3. InstrumentGroupDevice devices should now show nested chains")

if __name__ == "__main__":
    main()
