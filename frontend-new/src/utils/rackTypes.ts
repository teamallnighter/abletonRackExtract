/**
 * Rack type utility functions for display and styling
 */

export interface RackTypeInfo {
  displayName: string;
  icon: string;
  color: string;
  description: string;
}

export const getRackTypeInfo = (rackType?: string): RackTypeInfo => {
  switch (rackType) {
    case 'AudioEffectGroupDevice':
      return {
        displayName: 'Audio Effect Rack',
        icon: '🎛️',
        color: '#3b82f6', // Blue
        description: 'Collection of audio effect devices and chains'
      };
    
    case 'InstrumentGroupDevice':
      return {
        displayName: 'Instrument Rack',
        icon: '🎹',
        color: '#8b5cf6', // Purple
        description: 'Multi-instrument setup with key/velocity splits'
      };
    
    case 'MidiEffectGroupDevice':
      return {
        displayName: 'MIDI Effect Rack',
        icon: '🎵',
        color: '#10b981', // Emerald
        description: 'MIDI processing and routing effects chain'
      };
    
    default:
      return {
        displayName: 'Unknown Rack',
        icon: '❓',
        color: '#6b7280', // Gray
        description: 'Unknown or unsupported rack type'
      };
  }
};

export const getRackTypeBadgeClasses = (rackType?: string): string => {
  switch (rackType) {
    case 'AudioEffectGroupDevice':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    
    case 'InstrumentGroupDevice':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    
    case 'MidiEffectGroupDevice':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getRackTypeHeaderClasses = (rackType?: string): string => {
  switch (rackType) {
    case 'AudioEffectGroupDevice':
      return 'border-l-4 border-blue-500 bg-blue-50';
    
    case 'InstrumentGroupDevice':
      return 'border-l-4 border-purple-500 bg-purple-50';
    
    case 'MidiEffectGroupDevice':
      return 'border-l-4 border-emerald-500 bg-emerald-50';
    
    default:
      return 'border-l-4 border-gray-500 bg-gray-50';
  }
};