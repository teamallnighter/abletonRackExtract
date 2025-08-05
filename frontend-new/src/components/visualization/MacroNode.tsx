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
      className={`px-3 py-2 shadow-sm rounded-md bg-white border-2 transition-all duration-200 cursor-pointer
        touch-manipulation select-none active:scale-95 ${
        selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-300'
      } ${isHovered ? 'shadow-lg scale-105' : ''}`}
      style={{ 
        width: '80px', 
        height: '80px',
        minHeight: '80px',
        minWidth: '80px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-xs font-medium text-gray-900 text-center truncate w-full mb-1">
          {data.label}
        </div>
        
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mb-1">
          <span className="text-white text-xs font-bold">M{macro.index + 1}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isActive ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 'bg-gray-300'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className={`text-xs font-mono ${isActive ? 'text-purple-600 font-bold' : 'text-gray-500'}`}>
          {percentage}%
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2"
        style={{ backgroundColor: '#8b5cf6' }}
      />
    </div>
  );
});

MacroNode.displayName = 'MacroNode';

export default MacroNode;