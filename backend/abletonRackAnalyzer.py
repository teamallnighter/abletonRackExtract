#!/usr/bin/env python3
"""
Ableton Rack Analyzer V3 - Built from scratch based on actual XML structure
"""

import gzip
import xml.etree.ElementTree as ET
import os
import json

def decompress_and_parse_ableton_file(file_path):
    """Decompresses an Ableton .adg or .adv file and parses its XML content."""
    try:
        with gzip.open(file_path, 'rb') as f_in:
            xml_content = f_in.read()
            root = ET.fromstring(xml_content)
            return root
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def detect_rack_type_and_device(xml_root):
    """Detect the type of rack and return the main device element and rack type"""
    group_preset = xml_root.find(".//GroupDevicePreset")
    if group_preset is not None:
        device_container = group_preset.find("Device")
        if device_container is not None:
            # Check for different rack types
            for child in device_container:
                if child.tag in ["AudioEffectGroupDevice", "InstrumentGroupDevice", "MidiEffectGroupDevice"]:
                    return child.tag, child
    
    # Try alternate paths if main path doesn't work
    for rack_type in ["AudioEffectGroupDevice", "InstrumentGroupDevice", "MidiEffectGroupDevice"]:
        device = xml_root.find(f".//{rack_type}")
        if device is not None:
            return rack_type, device
    
    return None, None

def get_branch_preset_type(rack_type):
    """Get the corresponding branch preset type for a rack type"""
    branch_type_map = {
        "AudioEffectGroupDevice": "AudioEffectBranchPreset",
        "InstrumentGroupDevice": "InstrumentBranchPreset", 
        "MidiEffectGroupDevice": "MidiEffectBranchPreset"
    }
    return branch_type_map.get(rack_type)

def parse_chains_and_devices(xml_root, filename=None, verbose=False):
    """Parse the main rack structure based on actual Ableton XML format"""
    # Always use filename as rack name
    rack_name_from_file = os.path.splitext(os.path.basename(filename))[0] if filename else "Unknown"
    
    rack_info = {
        "rack_name": rack_name_from_file,  # Use filename as rack name
        "use_case": rack_name_from_file,
        "macro_controls": [],
        "chains": []
    }
    
    # Dynamic rack type detection
    rack_type, main_device = detect_rack_type_and_device(xml_root)
    
    if verbose:
        print(f"🔍 Detected rack type: {rack_type}")
    
    # Add rack type to the result
    rack_info["rack_type"] = rack_type
    
    # Error handling for unsupported rack types
    if rack_type is None:
        if verbose:
            print("⚠️  Warning: Unable to detect rack type. This may be an unsupported rack format.")
        rack_info["parsing_errors"] = ["Unknown rack type - unable to detect AudioEffectGroupDevice, InstrumentGroupDevice, or MidiEffectGroupDevice"]
        return rack_info
    
    if main_device is None:
        if verbose:
            print(f"⚠️  Warning: Detected rack type {rack_type} but could not find main device.")
        rack_info["parsing_errors"] = [f"Found rack type {rack_type} but could not locate main device element"]
        return rack_info
    
    if main_device is not None:
        # We're no longer overriding with UserName - filename takes precedence
        
        # Parse macro controls
        for i in range(16):
            macro_name_elem = main_device.find(f"MacroDisplayNames.{i}")
            if macro_name_elem is not None:
                macro_name = macro_name_elem.get("Value", f"Macro {i+1}")
                if macro_name != f"Macro {i+1}":  # Only include named macros
                    macro_control_elem = main_device.find(f"MacroControls.{i}/Manual")
                    macro_value = float(macro_control_elem.get("Value", "0")) if macro_control_elem is not None else 0.0
                    rack_info["macro_controls"].append({
                        "name": macro_name,
                        "value": macro_value,
                        "index": i
                    })
        
        # Look for chains in BranchPresets at the GroupDevicePreset level
        # This is where chains are actually stored, not in the Branches element
        branch_presets = xml_root.find(".//GroupDevicePreset/BranchPresets")
        if branch_presets is not None and rack_type is not None:
            # Get the appropriate branch preset type for this rack type
            branch_preset_type = get_branch_preset_type(rack_type)
            if branch_preset_type:
                branches = branch_presets.findall(branch_preset_type)
                if verbose:
                    print(f"🔍 Found {len(branches)} {branch_preset_type} elements")
                    
                if len(branches) == 0:
                    if verbose:
                        print(f"⚠️  Warning: No {branch_preset_type} elements found for {rack_type}")
                    rack_info.setdefault("parsing_warnings", []).append(f"No chains found - expected {branch_preset_type} elements")
                
                for idx, branch_preset in enumerate(branches):
                    try:
                        chain_info = parse_single_chain_branch(branch_preset, idx)
                        if chain_info:
                            rack_info["chains"].append(chain_info)
                        else:
                            if verbose:
                                print(f"⚠️  Warning: Failed to parse chain {idx + 1}")
                            rack_info.setdefault("parsing_warnings", []).append(f"Failed to parse chain {idx + 1}")
                    except Exception as e:
                        if verbose:
                            print(f"❌ Error parsing chain {idx + 1}: {e}")
                        rack_info.setdefault("parsing_errors", []).append(f"Error parsing chain {idx + 1}: {str(e)}")
            else:
                if verbose:
                    print(f"⚠️  Warning: Unknown branch preset type for rack type {rack_type}")
                rack_info.setdefault("parsing_errors", []).append(f"Unknown branch preset type for rack type {rack_type}")
        else:
            if branch_presets is None and verbose:
                print("⚠️  Warning: No BranchPresets element found")
                rack_info.setdefault("parsing_warnings", []).append("No BranchPresets element found - rack may not contain chains")
    
    return rack_info

def parse_single_chain_branch(branch_preset, chain_index=0):
    """Parse a single branch preset (AudioEffect, Instrument, or MidiEffect)"""
    chain_info = {
        "name": f"Chain {chain_index + 1}",  # Default name based on index
        "is_soloed": False,
        "devices": []
    }
    
    # Get chain name if available
    name_elem = branch_preset.find("Name")
    if name_elem is not None:
        name_value = name_elem.get("Value", "")
        if name_value:  # Only use if not empty
            chain_info["name"] = name_value
    
    # Check if soloed
    solo_elem = branch_preset.find("IsSoloed")
    if solo_elem is not None:
        chain_info["is_soloed"] = solo_elem.get("Value") == "true"
    
    # Parse devices in DevicePresets
    device_presets = branch_preset.find("DevicePresets")
    if device_presets is not None:
        # Handle both AbletonDevicePreset and GroupDevicePreset (nested racks)
        for device_preset in device_presets:
            device = device_preset.find("Device")
            if device is not None:
                # Get the first child element (the actual device)
                for child in device:
                    # Pass the device_preset element for nested rack context
                    device_info = parse_device(child, device_preset)
                    if device_info:
                        chain_info["devices"].append(device_info)
    
    return chain_info

def parse_device(device_elem, parent_preset=None):
    """Parse a single device element"""
    device_type = device_elem.tag
    
    # Map device types to friendly names - Complete Ableton Live 12 device list
    device_type_map = {
        # Audio Effects
        "AlignDelay": "Align Delay",
        "Amp": "Amp",
        "AudioEffectGroupDevice": "Audio Effect Rack",
        "AutoFilter": "Auto Filter",
        "AutoPan": "Auto Pan",
        "AutoShift": "Auto Shift",
        "BeatRepeat": "Beat Repeat",
        "Cabinet": "Cabinet",
        "ChannelEq": "Channel EQ",
        "Chorus": "Chorus-Ensemble",
        "ChromaticChorus": "Chorus-Ensemble",  # Same device, different mode
        "Compressor2": "Compressor",
        "Corpus": "Corpus",
        "Delay": "Delay",
        "DrumBuss": "Drum Buss",
        "DynamicTube": "Dynamic Tube",
        "Tube": "Dynamic Tube",  # Alias
        "Echo": "Echo",
        "EnvelopeFollower": "Envelope Follower",
        "FilterEQ3": "EQ Three",
        "Eq3": "EQ Three",  # Alias
        "Eq8": "EQ Eight",
        "Erosion": "Erosion",
        "ExternalAudioEffect": "External Audio Effect",
        "FilterDelay": "Filter Delay",
        "Gate": "Gate",
        "GlueCompressor": "Glue Compressor",
        "GrainDelay": "Grain Delay",
        "HybridReverb": "Hybrid Reverb",
        "LFO": "LFO",
        "Limiter": "Limiter",
        "Looper": "Looper",
        "MultibandDynamics": "Multiband Dynamics",
        "Overdrive": "Overdrive",
        "Pedal": "Pedal",
        "Phaser": "Phaser",
        "PhaserFlanger": "Phaser-Flanger",
        "Flanger": "Flanger",
        "Redux": "Redux",
        "Resonators": "Resonators",
        "Reverb": "Reverb",
        "Roar": "Roar",
        "Saturator": "Saturator",
        "Shaper": "Shaper",
        "Shifter": "Shifter",
        "FrequencyShifter": "Frequency Shifter",  # Alias
        "Frequency": "Frequency Shifter",  # Alias
        "SpectralResonator": "Spectral Resonator",
        "SpectralTime": "Spectral Time",
        "Spectrum": "Spectrum",
        "Tuner": "Tuner",
        "Utility": "Utility",
        "VinylDistortion": "Vinyl Distortion",
        "Vocoder": "Vocoder",
        "ConvolutionReverb": "Convolution Reverb",
        "ConvolutionReverbPro": "Convolution Reverb Pro",
        "InMeasurementDevice": "IR Measurement Device",
        "ColorLimiter": "Color Limiter",
        "GatedDelay": "Gated Delay",
        "PitchHack": "Pitch Hack",
        "ReEnveloper": "Re-Enveloper",
        "SpectralBlur": "Spectral Blur",
        "VectorDelay": "Vector Delay",
        "VectorFade": "Vector Fade",
        "ArrangementLooper": "Arrangement Looper",
        "Performer": "Performer",
        "Prearranger": "Prearranger",
        "VectorGrain": "Vector Grain",
        "SurroundPanner": "Surround Panner",
        
        # Instruments
        "AnalogDevice": "Analog",
        "Collision": "Collision",
        "DrumRack": "Drum Rack",
        "InstrumentRack": "Instrument Rack",
        "Electric": "Electric",
        "ExternalInstrument": "External Instrument",
        "GranulatorIII": "Granulator III",
        "InstrumentImpulse": "Impulse",
        "Meld": "Meld",
        "Operator": "Operator",
        "Poli": "Poli",
        "Sampler": "Sampler",
        "Simpler": "Simpler",
        "Tension": "Tension",
        "Wavetable": "Wavetable",
        "Bass": "Bass",
        "Drift": "Drift",
        "DrumSampler": "Drum Sampler",
        "DSClang": "DS Clang",
        "DSClap": "DS Clap",
        "DSCymbal": "DS Cymbal",
        "DSFM": "DS FM",
        "DSHH": "DS HH",
        "DSKick": "DS Kick",
        "DSSnare": "DS Snare",
        "DSTom": "DS Tom",
        "InstrumentGroupDevice": "Instrument Rack",
        "MidiEffectGroupDevice": "MIDI Effect Rack",
        "DrumGroupDevice": "Drum Rack",
        "Treee": "Tree Tone",
        "VectorFM": "Vector FM",
        "VectorGrain": "Vector Grain",
        
        # MIDI Effects
        "Arpeggiator": "Arpeggiator",
        "BouncyNotes": "Bouncy Notes",
        "CCControl": "CC Control",
        "Chord": "Chord",
        "EnvelopeMidi": "Envelope MIDI",
        "ExpressionControl": "Expression Control",
        "ExpressiveChords": "Expressive Chords",
        "MelodicSteps": "Melodic Steps",
        "Microtuner": "Microtuner",
        "MidiEffectRack": "MIDI Effect Rack",
        "MidiMonitor": "MIDI Monitor",
        "MPEControl": "MPE Control",
        "NoteEcho": "Note Echo",
        "NoteLength": "Note Length",
        "Pitch": "Pitch",
        "Random": "Random",
        "RhythmicSteps": "Rhythmic Steps",
        "Scale": "Scale",
        "ShaperMidi": "Shaper MIDI",
        "StepSequencer": "SQ Sequencer",
        "StepArp": "Step Arp",
        "Velocity": "Velocity"
    }
    
    # Check for custom device name (UserName) first
    user_name = device_elem.find("UserName")
    custom_name = None
    if user_name is not None and user_name.get("Value"):
        custom_name = user_name.get("Value")
    
    # Use custom name if available, otherwise use mapped device type name
    device_info = {
        "type": device_type,
        "name": custom_name if custom_name else device_type_map.get(device_type, device_type),
        "is_on": True
    }
    
    # Store preset name separately if it differs from the display name
    if custom_name:
        # If we have a custom name, the original device type becomes the preset
        original_device_name = device_type_map.get(device_type, device_type)
        if original_device_name.lower() != custom_name.lower():
            device_info["preset_name"] = original_device_name
    
    # Check if device is on
    on_elem = device_elem.find("On/Manual")
    if on_elem is not None:
        device_info["is_on"] = on_elem.get("Value") == "true"
    
    # If this is a nested rack, parse its chains
    if device_type == "AudioEffectGroupDevice" and parent_preset is not None:
        nested_chains = []
        # For nested racks, BranchPresets is at the same level as Device in GroupDevicePreset
        if parent_preset.tag == "GroupDevicePreset":
            branch_presets = parent_preset.find("BranchPresets")
            if branch_presets is not None:
                for idx, branch_preset in enumerate(branch_presets.findall("AudioEffectBranchPreset")):
                    chain_info = parse_single_chain_branch(branch_preset, idx)
                    if chain_info:
                        nested_chains.append(chain_info)
        device_info["chains"] = nested_chains
    
    return device_info

def export_xml_to_file(xml_root, original_file_path, output_folder="."):
    """Export XML content to file"""
    try:
        base_name = os.path.splitext(os.path.basename(original_file_path))[0]
        output_file = os.path.join(output_folder, f"{base_name}.xml")
        
        ET.indent(xml_root, space="  ", level=0)
        tree = ET.ElementTree(xml_root)
        tree.write(output_file, encoding='utf-8', xml_declaration=True)
        
        print(f"📄 XML exported to: {output_file}")
        return output_file
    except Exception as e:
        print(f"❌ Error exporting XML: {e}")
        return None

def export_analysis_to_json(rack_info, original_file_path, output_folder="."):
    """Export analysis to JSON"""
    try:
        base_name = os.path.splitext(os.path.basename(original_file_path))[0]
        output_file = os.path.join(output_folder, f"{base_name}_analysis.json")
        
        with open(output_file, 'w') as f:
            json.dump(rack_info, f, indent=2)
        
        print(f"📊 Analysis exported to: {output_file}")
        return output_file
    except Exception as e:
        print(f"❌ Error exporting analysis: {e}")
        return None

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        root = decompress_and_parse_ableton_file(sys.argv[1])
        if root is not None:
            rack_info = parse_chains_and_devices(root, sys.argv[1])
            print(json.dumps(rack_info, indent=2))
