import { useState, useEffect } from 'react';
import { useRackStore } from '../../stores/rackStore';

interface PerformanceStats {
  nodeCount: number;
  edgeCount: number;
  renderTime: number;
  memoryUsage?: number;
  isLargeRack: boolean;
  performanceMode: string;
}

const PerformanceMonitor = () => {
  const { nodes, edges } = useRackStore();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    const start = performance.now();
    
    // Calculate performance stats
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const isLargeRack = nodeCount > 25;
    
    let performanceMode = 'Optimal';
    if (nodeCount > 50) performanceMode = 'Performance Mode';
    else if (nodeCount > 25) performanceMode = 'Balanced';
    
    const end = performance.now();
    const renderTime = end - start;
    
    // Get memory usage if available
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      memoryUsage = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    }
    
    setStats({
      nodeCount,
      edgeCount,
      renderTime,
      memoryUsage,
      isLargeRack,
      performanceMode
    });
  }, [nodes, edges]);

  // Only show monitor in development or for large racks
  useEffect(() => {
    const shouldShow = process.env.NODE_ENV === 'development' || 
                     (stats?.isLargeRack === true && nodes.length > 0);
    setShowMonitor(shouldShow || false);
  }, [stats, nodes.length]);

  if (!showMonitor || !stats) return null;

  return (
    <div className="fixed bottom-2 left-2 sm:bottom-4 sm:left-4 bg-gray-900 text-white p-2 sm:p-3 rounded-lg shadow-lg text-xs font-mono z-40 max-w-xs
      scale-90 sm:scale-100">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Performance Monitor</span>
        <div className={`w-2 h-2 rounded-full ${
          stats.performanceMode === 'Optimal' ? 'bg-green-400' : 
          stats.performanceMode === 'Balanced' ? 'bg-yellow-400' : 'bg-red-400'
        }`} />
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Nodes:</span>
          <span className={stats.nodeCount > 50 ? 'text-red-400' : stats.nodeCount > 25 ? 'text-yellow-400' : 'text-green-400'}>
            {stats.nodeCount}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Edges:</span>
          <span>{stats.edgeCount}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Mode:</span>
          <span className={
            stats.performanceMode === 'Optimal' ? 'text-green-400' : 
            stats.performanceMode === 'Balanced' ? 'text-yellow-400' : 'text-red-400'
          }>
            {stats.performanceMode}
          </span>
        </div>
        
        {stats.memoryUsage && (
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={stats.memoryUsage > 100 ? 'text-yellow-400' : 'text-green-400'}>
              {stats.memoryUsage}MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>Render:</span>
          <span className={stats.renderTime > 16 ? 'text-yellow-400' : 'text-green-400'}>
            {stats.renderTime.toFixed(1)}ms
          </span>
        </div>
      </div>
      
      {stats.isLargeRack && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
          Large rack detected. Some features may be optimized for performance.
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;