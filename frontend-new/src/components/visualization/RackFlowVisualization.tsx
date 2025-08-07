import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useRackStore } from '../../stores/rackStore';
import { convertRackToFlow } from '../../utils/rackToFlow';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { usePerformanceOptimizations } from '../../hooks/usePerformanceOptimizations';
import ChainNode from './ChainNode';
import ChainContainer from './ChainContainer';
import DeviceNode from './DeviceNode';
import MacroNode from './MacroNode';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import ViewportControls from './ViewportControls';
import ExportControls from './ExportControls';
import PerformanceMonitor from './PerformanceMonitor';

const RackFlowVisualizationInner = () => {
  const { currentRack, setSelectedNode, selectedNodeId, setNodes } = useRackStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Convert rack data to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!currentRack?.analysis) {
      return { initialNodes: [], initialEdges: [] };
    }

    const { nodes, edges } = convertRackToFlow(currentRack.analysis);
    return { initialNodes: nodes, initialEdges: edges };
  }, [currentRack]);

  const [nodes, setNodesState, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);

  // Custom node change handler to implement parent-child movement
  const handleNodesChange = useCallback((changes: any[]) => {
    // Apply the changes first
    onNodesChange(changes);

    // Check for position changes on chain containers
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        setNodesState(currentNodes => {
          const node = currentNodes.find(n => n.id === change.id);
          
          // If a chain container moved, move all its child devices
          if (node?.type === 'chainContainer') {
            const chainId = node.id;
            const deltaX = change.position.x - (node.position?.x || 0);
            const deltaY = change.position.y - (node.position?.y || 0);

            return currentNodes.map(n => {
              // Move devices that belong to this chain
              if (n.type === 'device' && n.data?.chainId === chainId) {
                return {
                  ...n,
                  position: {
                    x: (n.position?.x || 0) + deltaX,
                    y: (n.position?.y || 0) + deltaY,
                  },
                };
              }
              return n;
            });
          }
          
          return currentNodes;
        });
      }
    });
  }, [onNodesChange, setNodesState]);

  // Performance optimizations
  const { optimizedEdges, performanceSettings, isPerformanceMode } = usePerformanceOptimizations({
    nodes: initialNodes,
    edges: initialEdges
  });

  // Get React Flow instance for programmatic control
  const reactFlowInstance = useReactFlow();

  // Update store nodes when React Flow nodes change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Handle fitView with performance settings
  useEffect(() => {
    if (reactFlowInstance && initialNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView(performanceSettings.fitViewOptions);
      }, 100);
    }
  }, [reactFlowInstance, initialNodes.length, performanceSettings.fitViewOptions]);

  // Define custom node types
  const nodeTypes = useMemo(
    () => ({
      chain: ChainNode,
      chainContainer: ChainContainer,
      device: DeviceNode,
      macro: MacroNode,
    }),
    []
  );

  // Handle node connections (for future interactive editing)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id === selectedNodeId ? null : node.id);
    },
    [setSelectedNode, selectedNodeId]
  );

  if (!currentRack) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rack Selected</h3>
          <p className="text-gray-600">Upload a rack file to see the visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gray-50 rounded-lg overflow-hidden border">
      <ReactFlow
        nodes={nodes}
        edges={optimizedEdges as Edge[]}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="react-flow-rack-visualization"
        minZoom={0.1}
        maxZoom={2}
        snapToGrid={isPerformanceMode}
        snapGrid={[10, 10]}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>

      <ViewportControls />
      <div className="absolute top-4 right-4 z-30">
        <ExportControls />
      </div>
      <KeyboardShortcutsHelp />
      <PerformanceMonitor />
    </div>
  );
};

const RackFlowVisualization = () => {
  return (
    <ReactFlowProvider>
      <RackFlowVisualizationInner />
    </ReactFlowProvider>
  );
};

export default RackFlowVisualization;