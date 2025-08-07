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

  // Create chain containers and devices
  analysis.chains.forEach((chain, chainIndex) => {
    const chainContainerId = getNextId();

    // Position chains horizontally - center devices within container
    const chainX = chainIndex * CHAIN_SPACING;
    const chainY = 100;

    // Device positioning within chain
    const deviceWidth = 150;
    const deviceX = chainX + (CHAIN_WIDTH - deviceWidth) / 2; // Center devices in chain

    // Calculate how many devices (including nested) we'll have
    let totalDeviceCount = 0;
    chain.devices.forEach(device => {
      if (device.chains && device.chains.length > 0) {
        // Count container + nested devices
        totalDeviceCount += 1; // container
        device.chains.forEach(nestedChain => {
          totalDeviceCount += nestedChain.devices.length;
        });
      } else {
        totalDeviceCount += 1;
      }
    });

    // Calculate container dimensions
    const containerPadding = 20;
    const headerHeight = 60;
    const containerHeight = Math.max(300, headerHeight + (totalDeviceCount * DEVICE_SPACING) + containerPadding * 2);
    const containerWidth = CHAIN_WIDTH + containerPadding * 2;

    // Position container to properly encompass devices
    const containerX = chainX - containerPadding;
    const containerY = chainY - containerPadding;

    // Create chain container background
    nodes.push({
      id: chainContainerId,
      type: 'chainContainer',
      position: { x: containerX, y: containerY },
      data: {
        label: chain.name || `Chain ${chainIndex + 1}`,
        type: 'chainContainer',
        data: chain,
        chainId: chainContainerId,
        chainIndex: chainIndex,
        chainName: chain.name || `Chain ${chainIndex + 1}`,
        chainColor: getChainColor(chainIndex),
        width: containerWidth,
        height: containerHeight,
        deviceCount: totalDeviceCount,
      }
    });

    // Create device nodes within the chain container
    let deviceY = chainY + headerHeight; // Start below container header
    let previousDeviceId = chainContainerId; // Connect first device to container

    chain.devices.forEach((device) => {
      // Check if this device has nested chains (Instrument/MIDI racks)
      if (device.chains && device.chains.length > 0) {
        // First, create the container rack node
        const containerDeviceNodeId = getNextId();

        nodes.push({
          id: containerDeviceNodeId,
          type: 'device',
          position: { x: deviceX, y: deviceY },
          data: {
            label: `${device.name} (${device.chains.length} chains)`,
            type: 'device',
            data: device,
            chainId: chainContainerId,
            chainIndex: chainIndex,
            chainName: chain.name || `Chain ${chainIndex + 1}`,
            chainColor: getChainColor(chainIndex),
            isContainer: true,
          }
        });

        // Create edge from previous device/chain to container
        edges.push({
          id: `edge-${previousDeviceId}-${containerDeviceNodeId}`,
          source: previousDeviceId,
          target: containerDeviceNodeId,
          type: 'smoothstep',
          animated: device.is_on,
          style: {
            stroke: device.is_on ? '#8b5cf6' : '#9ca3af', // Purple for container racks
            strokeWidth: device.is_on ? 3 : 2
          },
        });

        previousDeviceId = containerDeviceNodeId;
        deviceY += DEVICE_SPACING;

        // Then create the nested devices with indentation
        device.chains.forEach((nestedChain) => {
          nestedChain.devices.forEach((nestedDevice) => {
            const nestedDeviceNodeId = getNextId();

            // Indent nested devices to show hierarchy
            const nestedDeviceX = deviceX + 30; // Slightly indent nested devices

            nodes.push({
              id: nestedDeviceNodeId,
              type: 'device',
              position: { x: nestedDeviceX, y: deviceY },
              data: {
                label: nestedDevice.name,
                type: 'device',
                data: nestedDevice,
                chainId: chainContainerId,
                chainIndex: chainIndex,
                chainName: chain.name || `Chain ${chainIndex + 1}`,
                chainColor: getChainColor(chainIndex),
                isNested: true,
                nestingLevel: 1,
                parentDevice: device.name,
              }
            });

            // Create edge from previous device to current nested device
            edges.push({
              id: `edge-${previousDeviceId}-${nestedDeviceNodeId}`,
              source: previousDeviceId,
              target: nestedDeviceNodeId,
              type: 'smoothstep',
              animated: nestedDevice.is_on,
              style: {
                stroke: nestedDevice.is_on ? '#10b981' : '#9ca3af',
                strokeWidth: nestedDevice.is_on ? 2 : 1, // Thinner lines for nested devices
                strokeDasharray: '5,5', // Dashed lines for nested devices
              },
            });

            previousDeviceId = nestedDeviceNodeId;
            deviceY += DEVICE_SPACING * 0.8; // Slightly closer spacing for nested devices
          });
        });
      } else {
        // Regular device (not a nested rack)
        const deviceNodeId = getNextId();

        nodes.push({
          id: deviceNodeId,
          type: 'device',
          position: { x: deviceX, y: deviceY }, // Use consistent deviceX positioning
          data: {
            label: device.name,
            type: 'device',
            data: device,
            chainId: chainContainerId,
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

  // ... existing code ...
});
  });

// Create macro control nodes
// const macroStartY = 50;
// const macroSpacing = 80;

// analysis.macro_controls.forEach((macro, index) => {
//   const macroNodeId = getNextId();

//   nodes.push({
//     id: macroNodeId,
//     type: 'macro',
//     position: {
//       x: -200,
//       y: macroStartY + (index * macroSpacing)
//     },
//     data: {
//       label: macro.name || `Macro ${macro.index + 1}`,
//       type: 'macro',
//       data: macro,
//     }
//   });

//   // TODO: Add macro control mappings to device parameters
//   // This would require more detailed analysis of the macro mappings
//   // from the backend to know which devices/parameters are controlled
// });

return { nodes, edges };
};

// Utility to get device color based on type
// ... existing code ...

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