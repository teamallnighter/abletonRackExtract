import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { MacroControl } from '../../types/rack';

interface MacroNodeData {
  label: string;
  type: 'macro';
  data: MacroControl;
}

const MacroNode = memo(({ data, selected }: NodeProps & { data: MacroNodeData }) => {
  const macro = data.data;
  const percentage = Math.round((macro.value / 127) * 100);
  const [isHovered, setIsHovered] = useState(false);
  
  const isActive = percentage > 0;
  
  return (
    <div 
      className={`px-3 py-2 shadow-sm rounded-md bg-gradient-to-r from-orange-50 to-red-50 border-2 transition-all duration-200 cursor-pointer
        touch-manipulation select-none active:scale-95 ${
        selected ? 'border-orange-500' : 'border-orange-200'
      } ${isHovered ? 'shadow-lg scale-105' : ''}`}
      style={{ minHeight: '48px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm sm:text-xs font-medium text-gray-900">
          {data.label}
        </div>
        <div className={`text-sm sm:text-xs font-mono ${isActive ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>
          {percentage}%
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-1.5 mb-2">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${
            isActive ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gray-300'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">M{macro.index + 1}</span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-orange-500"
      />
    </div>
  );
});

MacroNode.displayName = 'MacroNode';

export default MacroNode;