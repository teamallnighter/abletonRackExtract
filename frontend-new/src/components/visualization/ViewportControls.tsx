import { useReactFlow, useViewport } from '@xyflow/react';
import { useRackStore } from '../../stores/rackStore';

const ViewportControls = () => {
  const reactFlowInstance = useReactFlow();
  const viewport = useViewport();
  const { nodes } = useRackStore();

  const handleFitView = () => {
    reactFlowInstance.fitView({ 
      padding: 0.1,
      duration: 800 
    });
  };

  const handleZoomIn = () => {
    reactFlowInstance.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    reactFlowInstance.zoomOut({ duration: 300 });
  };

  const handleReset = () => {
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 });
  };

  const handleCenterView = () => {
    if (nodes.length > 0) {
      const bounds = {
        x: Math.min(...nodes.map(n => n.position.x)),
        y: Math.min(...nodes.map(n => n.position.y)),
        width: Math.max(...nodes.map(n => n.position.x + 150)) - Math.min(...nodes.map(n => n.position.x)),
        height: Math.max(...nodes.map(n => n.position.y + 60)) - Math.min(...nodes.map(n => n.position.y))
      };
      
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      reactFlowInstance.setCenter(centerX, centerY, { zoom: viewport.zoom, duration: 500 });
    }
  };

  const zoomPercentage = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white rounded-lg shadow-lg border p-1 sm:p-2 z-30 scale-90 sm:scale-100">
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="flex items-center space-x-0.5 sm:space-x-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 sm:p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
            title="Zoom Out (Ctrl+-)"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <div className="text-xs text-gray-600 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gray-50 rounded min-w-[2.5rem] sm:min-w-[3rem] text-center">
            {zoomPercentage}%
          </div>
          
          <button
            onClick={handleZoomIn}
            className="p-1.5 sm:p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
            title="Zoom In (Ctrl++)"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-200" />
        
        <button
          onClick={handleFitView}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Fit to View (F)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        
        <button
          onClick={handleCenterView}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Center View (C)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        
        <button
          onClick={handleReset}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Reset View (R)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ViewportControls;