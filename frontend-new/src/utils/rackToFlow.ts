// Utility to convert rack analysis data to React Flow nodes and edges
import type { RackAnalysis, RackFlowNode, RackFlowEdge, Device } from '../types/rack';

const CHAIN_WIDTH = 200;
const CHAIN_SPACING = 300;
const DEVICE_SPACING = 100;

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
      }
    });
    
    // Create device nodes within the chain
    let deviceY = chainY + 150;
    let previousDeviceId = chainNodeId;
    
    chain.devices.forEach((device) => {
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
      
      // Handle nested racks (recursive)
      if (device.chains && device.chains.length > 0) {
        device.chains.forEach((nestedChain, nestedIndex) => {
          const nestedChainId = getNextId();
          const nestedX = deviceX + 250 + (nestedIndex * 200);
          const nestedY = deviceY;
          
          nodes.push({
            id: nestedChainId,
            type: 'chain',
            position: { x: nestedX, y: nestedY },
            data: {
              label: nestedChain.name || `Nested Chain ${nestedIndex + 1}`,
              type: 'chain',
              data: nestedChain,
            }
          });
          
          // Connect device to nested chain
          edges.push({
            id: `edge-${deviceNodeId}-${nestedChainId}`,
            source: deviceNodeId,
            target: nestedChainId,
            type: 'smoothstep',
            style: { 
              stroke: '#8b5cf6',
              strokeWidth: 2,
              strokeDasharray: '5,5'
            },
          });
        });
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