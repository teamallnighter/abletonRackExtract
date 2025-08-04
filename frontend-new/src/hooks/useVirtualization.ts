import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import type { RackFlowNode } from '../types/rack';

interface UseVirtualizationOptions {
  nodes: RackFlowNode[];
  viewportPadding?: number;
  maxVisibleNodes?: number;
}

export const useVirtualization = ({ 
  nodes, 
  viewportPadding = 200,
  maxVisibleNodes = 50 
}: UseVirtualizationOptions) => {
  const { x, y, zoom } = useViewport();

  const visibleNodes = useMemo(() => {
    if (nodes.length <= maxVisibleNodes) {
      return nodes; // No need to virtualize small sets
    }

    // Calculate viewport bounds with padding
    const viewportWidth = window.innerWidth / zoom;
    const viewportHeight = window.innerHeight / zoom;
    
    const viewportBounds = {
      left: -x / zoom - viewportPadding,
      top: -y / zoom - viewportPadding,
      right: -x / zoom + viewportWidth + viewportPadding,
      bottom: -y / zoom + viewportHeight + viewportPadding
    };

    // Filter nodes that are within or close to the viewport
    const visibleNodesSet = nodes.filter(node => {
      const nodeLeft = node.position.x;
      const nodeTop = node.position.y;
      const nodeRight = node.position.x + 150; // Default node width
      const nodeBottom = node.position.y + 60; // Default node height

      return (
        nodeRight >= viewportBounds.left &&
        nodeLeft <= viewportBounds.right &&
        nodeBottom >= viewportBounds.top &&
        nodeTop <= viewportBounds.bottom
      );
    });

    // Always include selected nodes and their immediate connections
    const selectedNodeIds = new Set(visibleNodesSet.map(n => n.id));
    
    // Add nodes connected to visible nodes to prevent edge rendering issues
    nodes.forEach(node => {
      if (selectedNodeIds.has(node.id)) return;
      
      // Check if this node has edges to visible nodes
      // (This would require edge information, simplified for now)
      const hasConnectionToVisible = false; // Implement based on edge data
      
      if (hasConnectionToVisible) {
        visibleNodesSet.push(node);
      }
    });

    return visibleNodesSet;
  }, [nodes, x, y, zoom, viewportPadding, maxVisibleNodes]);

  const hiddenNodeCount = nodes.length - visibleNodes.length;

  return {
    visibleNodes,
    hiddenNodeCount,
    isVirtualized: nodes.length > maxVisibleNodes
  };
};