import { useParams } from 'react-router-dom';
import { useRackQuery } from '../hooks/useRackQuery';
import { useRackStore } from '../stores/rackStore';
import LazyRackVisualization from '../components/visualization/LazyRackVisualization';
import RackDetailsPanel from '../components/visualization/RackDetailsPanel';
import { getRackTypeInfo, getRackTypeBadgeClasses, getRackTypeHeaderClasses } from '../utils/rackTypes';

const RackVisualizationPage = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const { isLoading, error } = useRackQuery(rackId);
  const { currentRack, isLoading: storeLoading, error: storeError } = useRackStore();

  // This will be replaced with the actual React Flow visualization in Phase 2
  if (isLoading || storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading rack visualization...</p>
        </div>
      </div>
    );
  }

  if (error || storeError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 13.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Rack</h2>
        <p className="text-gray-600">{error?.message || storeError}</p>
      </div>
    );
  }

  if (!currentRack) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Rack not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg shadow-sm border p-6 ${getRackTypeHeaderClasses(currentRack.rack_type || currentRack.analysis?.rack_type)}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentRack.rack_name}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getRackTypeBadgeClasses(currentRack.rack_type || currentRack.analysis?.rack_type)}`}>
                <span>{getRackTypeInfo(currentRack.rack_type || currentRack.analysis?.rack_type).icon}</span>
                {getRackTypeInfo(currentRack.rack_type || currentRack.analysis?.rack_type).displayName}
              </span>
            </div>
            {currentRack.description && (
              <p className="text-gray-600 mb-2">{currentRack.description}</p>
            )}
            <p className="text-sm text-gray-500 mb-2">
              {getRackTypeInfo(currentRack.rack_type || currentRack.analysis?.rack_type).description}
            </p>
            {currentRack.producer_name && (
              <p className="text-sm text-blue-600">by {currentRack.producer_name}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{currentRack.stats.total_chains} chains</p>
            <p>{currentRack.stats.total_devices} devices</p>
            <p>{currentRack.stats.macro_controls} macros</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout - Efficient Space Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 min-h-[500px] lg:min-h-[600px]">
        {/* React Flow Visualization - 60% width */}
        <div className="lg:col-span-3 order-1">
          <div className="bg-white rounded-lg shadow-sm border h-full">
            <div className="p-4 md:p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Rack Visualization</h2>
              <p className="text-gray-600 text-sm hidden sm:block">Interactive flowchart diagram - click nodes for details</p>
              <p className="text-gray-600 text-sm sm:hidden">Tap nodes for details</p>
            </div>
            <div className="p-2 md:p-6 h-[calc(100%-80px)]">
              <LazyRackVisualization />
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - 40% width with stacked components */}
        <div className="lg:col-span-2 order-2 lg:order-2 space-y-3 lg:space-y-4">
          {/* Selected Node Details Panel - Top Priority */}
          <div className="bg-white rounded-lg shadow-sm border">
            <RackDetailsPanel />
          </div>
          
          {/* Macro Controls - Quick Access */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-3 lg:p-4 border-b">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Macro Controls</h3>
            </div>
            <div className="p-3 lg:p-4 space-y-2 lg:space-y-3 max-h-48 lg:max-h-64 overflow-y-auto">
              {currentRack.analysis.macro_controls.map((macro) => (
                <div key={macro.index} className="flex justify-between items-center">
                  <span className="text-gray-900 text-sm font-medium truncate pr-2" title={macro.name || `Macro ${macro.index + 1}`}>
                    {macro.name || `Macro ${macro.index + 1}`}
                  </span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200" 
                        style={{ width: `${(macro.value / 127) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {Math.round((macro.value / 127) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chains List - Browsable */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-3 lg:p-4 border-b">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900">Chains</h3>
            </div>
            <div className="p-3 lg:p-4 space-y-2 lg:space-y-3 max-h-64 lg:max-h-80 overflow-y-auto">
              {currentRack.analysis.chains.map((chain, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {chain.name || `Chain ${index + 1}`}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {chain.is_soloed && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Solo
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {chain.devices.length} devices
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {chain.devices.slice(0, 3).map((device, deviceIndex) => (
                      <div key={deviceIndex} className="flex justify-between items-center text-xs">
                        <span className={`truncate pr-2 ${device.is_on ? 'text-gray-800' : 'text-gray-400'}`} title={device.name}>
                          {device.name}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${device.is_on ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                      </div>
                    ))}
                    {chain.devices.length > 3 && (
                      <div className="text-xs text-gray-400 italic">
                        +{chain.devices.length - 3} more devices
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackVisualizationPage;