import type { Device } from '../../types/rack';
import { getDeviceColor } from '../../utils/rackToFlow';

interface DeviceTooltipProps {
  device: Device;
  position: { x: number; y: number };
  visible: boolean;
}

const DeviceTooltip = ({ device, position, visible }: DeviceTooltipProps) => {
  if (!visible) return null;

  const deviceColor = getDeviceColor(device.type);
  
  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 shadow-lg rounded-lg p-3 pointer-events-none max-w-xs"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="flex items-start space-x-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${deviceColor}20`, color: deviceColor }}
        >
          <span className="text-sm font-bold">
            {device.type.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <div className="min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">
            {device.name}
          </h4>
          
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-medium">{device.type}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-medium ${device.is_on ? 'text-green-600' : 'text-gray-400'}`}>
                {device.is_on ? 'On' : 'Off'}
              </span>
            </div>
            
            {device.preset_name && (
              <div className="flex justify-between">
                <span>Preset:</span>
                <span className="font-medium text-blue-600">{device.preset_name}</span>
              </div>
            )}
            
            {device.chains && device.chains.length > 0 && (
              <div className="flex justify-between">
                <span>Nested:</span>
                <span className="font-medium text-purple-600">
                  {device.chains.length} chain{device.chains.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tooltip arrow */}
      <div 
        className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
      />
    </div>
  );
};

export default DeviceTooltip;