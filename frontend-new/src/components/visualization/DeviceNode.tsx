import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Device } from '../../types/rack';
import { getDeviceColor } from '../../utils/rackToFlow';
import DeviceTooltip from './DeviceTooltip';

interface DeviceNodeData {
  label: string;
  type: 'device';
  data: Device;
}

const DeviceNodeComponent = ({ data, selected }: NodeProps & { data: DeviceNodeData }) => {
  const device = data.data;
  const deviceColor = getDeviceColor(device.type);
  const hasNestedChains = device.chains && device.chains.length > 0;
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY + rect.height / 2
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <>
      <div 
        className={`px-3 py-2 shadow-sm rounded-md bg-white border-2 transition-all duration-200 cursor-pointer
          touch-manipulation select-none active:scale-95 ${
          selected ? 'border-blue-500 shadow-md' : 'border-gray-200'
        } ${!device.is_on ? 'opacity-60' : ''} ${isHovered ? 'shadow-lg scale-105' : ''}`}
        style={{ minHeight: '44px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 sm:w-2 sm:h-2"
        style={{ backgroundColor: deviceColor }}
      />
      
      <div className="flex items-center space-x-2">
        <div 
          className="w-8 h-8 sm:w-6 sm:h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${deviceColor}20`, color: deviceColor }}
        >
          {getDeviceIcon(device.type)}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-xs font-medium text-gray-900 truncate">
            {data.label}
          </div>
          {device.preset_name && (
            <div className="text-xs text-gray-500 truncate">
              {device.preset_name}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {hasNestedChains && (
            <div className="w-2 h-2 bg-purple-400 rounded-full" title="Contains nested chains" />
          )}
          <div 
            className={`w-2 h-2 rounded-full ${
              device.is_on ? 'bg-green-400' : 'bg-gray-300'
            }`}
            title={device.is_on ? 'On' : 'Off'}
          />
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2"
        style={{ backgroundColor: deviceColor }}
      />
      
      {hasNestedChains && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-2 h-2 !bg-purple-500"
          id="nested"
        />
      )}
      </div>
      
      <DeviceTooltip 
        device={device}
        position={tooltipPosition}
        visible={isHovered}
      />
    </>
  );
};

// Helper function to get device icon based on type
const getDeviceIcon = (deviceType: string) => {
  const type = deviceType.toLowerCase();
  
  if (type.includes('instrument') || type.includes('drum') || type.includes('operator')) {
    return <span className="text-xs">🎹</span>;
  }
  
  if (type.includes('reverb') || type.includes('delay')) {
    return <span className="text-xs">🌊</span>;
  }
  
  if (type.includes('eq') || type.includes('filter')) {
    return <span className="text-xs">⚡</span>;
  }
  
  if (type.includes('compressor')) {
    return <span className="text-xs">🔧</span>;
  }
  
  if (type.includes('midi') || type.includes('arpeggiator')) {
    return <span className="text-xs">🎵</span>;
  }
  
  if (type.includes('utility') || type.includes('gain')) {
    return <span className="text-xs">⚙️</span>;
  }
  
  return <span className="text-xs">●</span>;
};

// Performance optimization: custom comparison function
const arePropsEqual = (prevProps: NodeProps & { data: DeviceNodeData }, nextProps: NodeProps & { data: DeviceNodeData }) => {
  // Only re-render if essential data changes
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.data.is_on === nextProps.data.data.is_on &&
    prevProps.data.data.preset_name === nextProps.data.data.preset_name &&
    JSON.stringify(prevProps.data.data.chains) === JSON.stringify(nextProps.data.data.chains)
  );
};

const DeviceNode = memo(DeviceNodeComponent, arePropsEqual);
DeviceNode.displayName = 'DeviceNode';

export default DeviceNode;