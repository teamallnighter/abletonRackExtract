import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useRackExport } from '../../hooks/useRackExport';
import { useRackStore } from '../../stores/rackStore';

const ExportControls = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const reactFlowInstance = useReactFlow();
  const { exportToPNG, exportToSVG, exportToJSON, canExport } = useRackExport();
  const { currentRack } = useRackStore();

  const handleExport = async (type: 'png' | 'svg' | 'json') => {
    if (!canExport) return;
    
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    setShowDropdown(false);

    try {
      let success = false;
      
      switch (type) {
        case 'png':
          success = (await exportToPNG(reactFlowInstance)) || false;
          break;
        case 'svg':
          success = (await exportToSVG(reactFlowInstance)) || false;
          break;
        case 'json':
          success = exportToJSON() || false;
          break;
      }

      if (success) {
        setExportSuccess(`Successfully exported as ${type.toUpperCase()}`);
        setTimeout(() => setExportSuccess(null), 3000);
      } else {
        setExportError(`Failed to export as ${type.toUpperCase()}`);
        setTimeout(() => setExportError(null), 3000);
      }
    } catch (error) {
      setExportError(`Export failed: ${error}`);
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  if (!canExport) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
      >
        {isExporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        <span className="hidden sm:inline">Export</span>
        <span className="sm:hidden">📤</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 sm:left-0 right-0 sm:right-auto mt-1 w-full sm:w-48 bg-white rounded-lg shadow-lg border z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('png')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Export as PNG
              <span className="ml-auto text-gray-400 text-xs">High quality</span>
            </button>
            
            <button
              onClick={() => handleExport('svg')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export as SVG
              <span className="ml-auto text-gray-400 text-xs">Vector</span>
            </button>
            
            <button
              onClick={() => handleExport('json')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as JSON
              <span className="ml-auto text-gray-400 text-xs">Data</span>
            </button>
          </div>
          
          <div className="border-t py-2 px-4">
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">{currentRack?.rack_name}</div>
              <div>{currentRack?.stats.total_chains} chains • {currentRack?.stats.total_devices} devices</div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error notifications */}
      {exportSuccess && (
        <div className="absolute top-full left-0 mt-2 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm z-50">
          {exportSuccess}
        </div>
      )}
      
      {exportError && (
        <div className="absolute top-full left-0 mt-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm z-50">
          {exportError}
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default ExportControls;