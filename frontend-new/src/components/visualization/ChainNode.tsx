import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Chain } from '../../types/rack';

interface ChainNodeData {
  label: string;
  type: 'chain';
  data: Chain;
}

const ChainNode = memo(({ data, selected }: NodeProps & { data: ChainNodeData }) => {
  const chain = data.data;
  const deviceCount = chain.devices.length;
  const [isHovered, setIsHovered] = useState(false);
  
  const activeDevices = chain.devices.filter(device => device.is_on).length;
  const hasActiveDevices = activeDevices > 0;
  
  return (
    <div 
      className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 transition-all duration-200 cursor-pointer
        touch-manipulation select-none active:scale-95 ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } ${chain.is_soloed ? 'ring-2 ring-yellow-400' : ''} ${isHovered ? 'shadow-lg scale-105' : ''}`}
      style={{ minHeight: '48px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base sm:text-sm font-semibold text-gray-900">
            {data.label}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {deviceCount} device{deviceCount !== 1 ? 's' : ''}
            {hasActiveDevices && (
              <span className="text-green-600 ml-1">
                ({activeDevices} active)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {chain.is_soloed && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Soloed" />
          )}
          <div className="w-10 h-10 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});

ChainNode.displayName = 'ChainNode';

export default ChainNode;