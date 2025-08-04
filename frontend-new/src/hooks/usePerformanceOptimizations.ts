import { useMemo, useCallback } from 'react';
import { debounce } from '../utils/performance';
import type { RackFlowNode, RackFlowEdge } from '../types/rack';

interface UsePerformanceOptimizationsOptions {
  nodes: RackFlowNode[];
  edges: RackFlowEdge[];
  enableVirtualization?: boolean;
  enableEdgeOptimization?: boolean;
  debounceMs?: number;
}

export const usePerformanceOptimizations = ({
  nodes,
  edges,
  enableEdgeOptimization = true,
  debounceMs = 100
}: UsePerformanceOptimizationsOptions) => {
  
  // Memoize expensive calculations
  const nodeStats = useMemo(() => {
    const totalNodes = nodes.length;
    const activeNodes = nodes.filter(node => {
      if (node.data.type === 'device' && 'is_on' in node.data.data) {
        return (node.data.data as any).is_on;
      }
      return true;
    }).length;
    
    const nodesByType = nodes.reduce((acc, node) => {
      acc[node.data.type] = (acc[node.data.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalNodes,
      active: activeNodes,
      byType: nodesByType,
      isLarge: totalNodes > 25,
      isVeryLarge: totalNodes > 50
    };
  }, [nodes]);

  // Optimize edges for large racks
  const optimizedEdges = useMemo(() => {
    if (!enableEdgeOptimization || edges.length < 20) {
      return edges;
    }

    // Group edges by type and reduce visual complexity
    return edges.map(edge => {
      // Reduce animation on large racks for performance
      if (nodeStats.isVeryLarge) {
        return { ...edge, animated: false };
      }
      
      // Simplify edge styles for better performance
      if (nodeStats.isLarge) {
        return {
          ...edge,
          style: {
            ...edge.style,
            strokeWidth: Math.min((edge.style?.strokeWidth as number) || 2, 2)
          }
        };
      }
      
      return edge;
    });
  }, [edges, enableEdgeOptimization, nodeStats]);

  // Debounced handlers for expensive operations
  const debouncedHandlers = useMemo(() => {
    const handleNodeSelect = debounce((nodeId: string | null) => {
      // This would be passed down from parent component
      console.log('Node selected:', nodeId);
    }, debounceMs);

    const handleViewportChange = debounce((viewport: any) => {
      // Handle viewport changes with debouncing
      console.log('Viewport changed:', viewport);
    }, debounceMs);

    return {
      handleNodeSelect,
      handleViewportChange
    };
  }, [debounceMs]);

  // Performance recommendations based on rack size
  const performanceSettings = useMemo(() => {
    if (nodeStats.isVeryLarge) {
      return {
        fitViewOptions: { duration: 300, padding: 0.05 },
        animationDuration: 200,
        enableAnimations: false,
        simplifyNodes: true,
        reduceTooltips: true
      };
    }
    
    if (nodeStats.isLarge) {
      return {
        fitViewOptions: { duration: 500, padding: 0.1 },
        animationDuration: 300,
        enableAnimations: true,
        simplifyNodes: false,
        reduceTooltips: false
      };
    }

    return {
      fitViewOptions: { duration: 800, padding: 0.1 },
      animationDuration: 400,
      enableAnimations: true,
      simplifyNodes: false,
      reduceTooltips: false
    };
  }, [nodeStats]);

  // Memory cleanup utilities
  const cleanupResources = useCallback(() => {
    // Clean up any event listeners, timers, or heavy resources
    // This would be called on component unmount
  }, []);

  return {
    nodeStats,
    optimizedEdges,
    performanceSettings,
    debouncedHandlers,
    cleanupResources,
    isPerformanceMode: nodeStats.isLarge
  };
};