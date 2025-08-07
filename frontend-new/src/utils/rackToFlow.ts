// Utility to convert rack analysis data to React Flow nodes and edges
import type { RackAnalysis, RackFlowNode, RackFlowEdge, Device } from '../types/rack';

const CHAIN_WIDTH = 200;
const CHAIN_SPACING = 300;
const DEVICE_SPACING = 100;

// Chain highlighting colors (following the PRD color scheme)
const CHAIN_COLORS = [
  '#10b981', // Emerald 500 (green)
  '#3b82f6', // Blue 500 
  '#f59e0b', // Amber 500 (yellow)
  '#8b5cf6', // Violet 500 (purple)
  '#ef4444', // Red 500
  '#06b6d4', // Cyan 500
  '#84cc16', // Lime 500
  '#f97316', // Orange 500
];

export const getChainColor = (chainIndex: number): string => {
  return CHAIN_COLORS[chainIndex % CHAIN_COLORS.length];
};

export const convertRackToFlow = (analysis: RackAnalysis): { nodes: RackFlowNode[], edges: RackFlowEdge[] } => {
  const nodes: RackFlowNode[] = [];
  const edges: RackFlowEdge[] = [];
  
  let nodeId = 0;
  const getNextId = () => `node-${nodeId++}`;
  
  // Create chain nodes
  analysis.chains.forEach((chain, chainIndex) => {
    const chainNodeId = getNextId();
    
    // Position chains horizontally
    const chainX = chainIndex * CHAIN_SPACING;
    const chainY = 100;
    
    // Create chain node
    nodes.push({
      id: chainNodeId,
      type: 'chain',
      position: { x: chainX, y: chainY },
      data: {
        label: chain.name || `Chain ${chainIndex + 1}`,
        type: 'chain',
        data: chain,
        chainId: chainNodeId,
        chainIndex: chainIndex,
        chainName: chain.name || `Chain ${chainIndex + 1}`,
        chainColor: getChainColor(chainIndex),
      }
    });
    
    // Create device nodes within the chain
    let deviceY = chainY + 150;
    let previousDeviceId = chainNodeId;
    
    chain.devices.forEach((device) => {
      // Check if this device has nested chains (Instrument/MIDI racks)
      if (device.chains && device.chains.length > 0) {
        // For nested racks, show the individual devices instead of the container
        device.chains.forEach((nestedChain) => {
          nestedChain.devices.forEach((nestedDevice) => {
            const nestedDeviceNodeId = getNextId();
            
            // Position devices vertically below chain
            const deviceX = chainX + (CHAIN_WIDTH - 150) / 2; // Center devices in chain
            
            nodes.push({
              id: nestedDeviceNodeId,
              type: 'device',
              position: { x: deviceX, y: deviceY },
              data: {
                label: nestedDevice.name,
                type: 'device',
                data: nestedDevice,
                chainId: chainNodeId,
                chainIndex: chainIndex,
                chainName: chain.name || `Chain ${chainIndex + 1}`,
                chainColor: getChainColor(chainIndex),
              }
            });
            
            // Create edge from previous device/chain to current device
            edges.push({
              id: `edge-${previousDeviceId}-${nestedDeviceNodeId}`,
              source: previousDeviceId,
              target: nestedDeviceNodeId,
              type: 'smoothstep',
              animated: nestedDevice.is_on,
              style: { 
                stroke: nestedDevice.is_on ? '#10b981' : '#9ca3af',
                strokeWidth: nestedDevice.is_on ? 3 : 2 
              },
            });
            
            previousDeviceId = nestedDeviceNodeId;
            deviceY += DEVICE_SPACING;
          });
        });
      } else {
        // Regular device (not a nested rack)
        const deviceNodeId = getNextId();
        
        // Position devices vertically below chain
        const deviceX = chainX + (CHAIN_WIDTH - 150) / 2; // Center devices in chain
        
        nodes.push({
          id: deviceNodeId,
          type: 'device',
          position: { x: deviceX, y: deviceY },
          data: {
            label: device.name,
            type: 'device',
            data: device,
            chainId: chainNodeId,
            chainIndex: chainIndex,
            chainName: chain.name || `Chain ${chainIndex + 1}`,
            chainColor: getChainColor(chainIndex),
          }
        });
        
        // Create edge from previous device/chain to current device
        edges.push({
          id: `edge-${previousDeviceId}-${deviceNodeId}`,
          source: previousDeviceId,
          target: deviceNodeId,
          type: 'smoothstep',
          animated: device.is_on,
          style: { 
            stroke: device.is_on ? '#10b981' : '#9ca3af',
            strokeWidth: device.is_on ? 3 : 2 
          },
        });
        
        previousDeviceId = deviceNodeId;
        deviceY += DEVICE_SPACING;
      }
    });
  });
  
  // Create macro control nodes
  const macroStartY = 50;
  const macroSpacing = 80;
  
  analysis.macro_controls.forEach((macro, index) => {
    const macroNodeId = getNextId();
    
    nodes.push({
      id: macroNodeId,
      type: 'macro',
      position: { 
        x: -200, 
        y: macroStartY + (index * macroSpacing) 
      },
      data: {
        label: macro.name || `Macro ${macro.index + 1}`,
        type: 'macro',
        data: macro,
      }
    });
    
    // TODO: Add macro control mappings to device parameters
    // This would require more detailed analysis of the macro mappings
    // from the backend to know which devices/parameters are controlled
  });
  
  return { nodes, edges };
};

// Utility to get device color based on type
export const getDeviceColor = (deviceType: string): string => {
  const type = deviceType.toLowerCase();
  
  if (type.includes('instrument') || type.includes('drum') || type.includes('operator')) {
    return '#3B82F6'; // Blue for instruments
  }
  
  if (type.includes('reverb') || type.includes('delay') || type.includes('eq') || 
      type.includes('compressor') || type.includes('filter')) {
    return '#10B981'; // Green for audio effects
  }
  
  if (type.includes('midi') || type.includes('arpeggiator') || type.includes('scale')) {
    return '#8B5CF6'; // Purple for MIDI effects
  }
  
  if (type.includes('utility') || type.includes('gain') || type.includes('spectrum')) {
    return '#6B7280'; // Gray for utilities
  }
  
  return '#EF4444'; // Red for unknown/other
};

// Utility to format device info for tooltips
export const formatDeviceInfo = (device: Device): string => {
  const parts = [
    `Type: ${device.type}`,
    `Status: ${device.is_on ? 'On' : 'Off'}`,
  ];
  
  if (device.preset_name) {
    parts.push(`Preset: ${device.preset_name}`);
  }
  
  if (device.chains && device.chains.length > 0) {
    parts.push(`Contains ${device.chains.length} nested chain(s)`);
  }
  
  return parts.join('\n');
};