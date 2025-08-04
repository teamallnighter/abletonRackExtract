import { useParams } from 'react-router-dom';
import { useRackQuery } from '../hooks/useRackQuery';
import { useRackStore } from '../stores/rackStore';
import LazyRackVisualization from '../components/visualization/LazyRackVisualization';
import RackDetailsPanel from '../components/visualization/RackDetailsPanel';

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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {currentRack.rack_name}
            </h1>
            {currentRack.description && (
              <p className="text-gray-600 mb-2">{currentRack.description}</p>
            )}
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

      {/* Main Content Grid - Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {/* React Flow Visualization */}
        <div className="lg:col-span-2 xl:col-span-3 order-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 md:p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Rack Visualization</h2>
              <p className="text-gray-600 text-sm hidden sm:block">Interactive flowchart diagram - click nodes for details</p>
              <p className="text-gray-600 text-sm sm:hidden">Tap nodes for details</p>
            </div>
            <div className="p-2 md:p-6">
              <LazyRackVisualization />
            </div>
          </div>
        </div>
        
        {/* Details Panel - Mobile First */}
        <div className="lg:col-span-1 xl:col-span-1 order-2 lg:order-2">
          <RackDetailsPanel />
        </div>
      </div>

      {/* Rack Analysis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chains */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Chains</h3>
          </div>
          <div className="p-6 space-y-4">
            {currentRack.analysis.chains.map((chain, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">
                    {chain.name || `Chain ${index + 1}`}
                  </h4>
                  {chain.is_soloed && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      Soloed
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {chain.devices.map((device, deviceIndex) => (
                    <div key={deviceIndex} className="flex justify-between items-center text-sm">
                      <span className={`${device.is_on ? 'text-gray-900' : 'text-gray-400'}`}>
                        {device.name}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${device.is_on ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro Controls */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Macro Controls</h3>
          </div>
          <div className="p-6 space-y-3">
            {currentRack.analysis.macro_controls.map((macro) => (
              <div key={macro.index} className="flex justify-between items-center">
                <span className="text-gray-900">
                  {macro.name || `Macro ${macro.index + 1}`}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(macro.value / 127) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-8">
                    {Math.round((macro.value / 127) * 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackVisualizationPage;