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
        <div 
          className="text-xs font-medium text-gray-900 text-center truncate w-full mb-1 relative group cursor-help"
          title={macro.name || data.label || `Macro ${macro.index + 1}`}
        >
          {macro.name || data.label || `M${macro.index + 1}`}
          {/* Tooltip for full title on hover */}
          {(macro.name || data.label) && (macro.name || data.label).length > 8 && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {macro.name || data.label}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          )}
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