import { useRackStore } from '../../stores/rackStore';
import { getDeviceColor } from '../../utils/rackToFlow';
import type { Chain, Device, MacroControl } from '../../types/rack';

const RackDetailsPanel = () => {
  const { currentRack, selectedNodeId, nodes } = useRackStore();
  
  if (!currentRack || !selectedNodeId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm">Select a node to view details</p>
        </div>
      </div>
    );
  }
  
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  if (!selectedNode) return null;
  
  const renderChainDetails = (chain: Chain) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Chain Details</h3>
        {chain.is_soloed && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            Soloed
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Devices:</span>
          <span className="ml-2 font-medium">{chain.devices.length}</span>
        </div>
        <div>
          <span className="text-gray-500">Active:</span>
          <span className="ml-2 font-medium text-green-600">
            {chain.devices.filter(d => d.is_on).length}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Devices in Chain</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {chain.devices.map((device, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getDeviceColor(device.type) }}
                />
                <span className="text-sm font-medium">{device.name}</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${device.is_on ? 'bg-green-400' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  const renderDeviceDetails = (device: Device) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Device Details</h3>
        <div className={`w-3 h-3 rounded-full ${device.is_on ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ 
              backgroundColor: `${getDeviceColor(device.type)}20`, 
              color: getDeviceColor(device.type) 
            }}
          >
            <span className="text-sm font-bold">
              {device.type.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{device.name}</div>
            <div className="text-sm text-gray-500">{device.type}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${device.is_on ? 'text-green-600' : 'text-gray-400'}`}>
              {device.is_on ? 'On' : 'Off'}
            </span>
          </div>
          {device.preset_name && (
            <div>
              <span className="text-gray-500">Preset:</span>
              <span className="ml-2 font-medium text-blue-600">{device.preset_name}</span>
            </div>
          )}
        </div>
        
        {device.chains && device.chains.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-900 mb-2">Nested Chains</h4>
            <div className="space-y-1">
              {device.chains.map((nestedChain, index) => (
                <div key={index} className="text-sm text-purple-600">
                  {nestedChain.name || `Chain ${index + 1}`} ({nestedChain.devices.length} devices)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderMacroDetails = (macro: MacroControl) => {
    const percentage = Math.round((macro.value / 127) * 100);
    const isActive = percentage > 0;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Macro Control</h3>
          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
            M{macro.index + 1}
          </span>
        </div>
        
        <div className="space-y-3">
          {/* Macro Title and Name */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {macro.name || `Macro ${macro.index + 1}`}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {percentage}%
            </div>
            <div className="text-sm text-gray-500">Current Value</div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isActive ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gray-300'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
            <div className="text-left">0</div>
            <div className="text-center">64</div>
            <div className="text-right">127</div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Raw Value:</span>
              <span className="font-medium text-gray-900">{macro.value}/127</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Index:</span>
              <span className="font-medium text-gray-900">{macro.index + 1}</span>
            </div>
            {macro.name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Custom Name:</span>
                <span className="font-medium text-gray-900 text-right ml-2" title={macro.name}>
                  {macro.name.length > 20 ? `${macro.name.slice(0, 20)}...` : macro.name}
                </span>
              </div>
            )}
          </div>
          
          {/* Note about missing configuration data */}
          {!macro.name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-700">
                <strong>Note:</strong> No custom configuration found. Custom macro names and descriptions from setup may not be captured in the current analysis.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const nodeData = selectedNode.data;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {nodeData.type === 'chain' && renderChainDetails(nodeData.data as Chain)}
      {nodeData.type === 'device' && renderDeviceDetails(nodeData.data as Device)}
      {nodeData.type === 'macro' && renderMacroDetails(nodeData.data as MacroControl)}
    </div>
  );
};

export default RackDetailsPanel;