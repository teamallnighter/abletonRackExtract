// TypeScript types based on the existing Python backend data structure

export interface MacroControl {
  index: number;
  name: string;
  value: number;
}

export interface Device {
  name: string;
  type: string;
  is_on: boolean;
  preset_name?: string;
  chains?: Chain[]; // For nested racks
}

export interface Chain {
  name: string;
  is_soloed: boolean;
  devices: Device[];
}

export interface RackAnalysis {
  rack_name: string;
  rack_type?: string;
  chains: Chain[];
  macro_controls: MacroControl[];
  user_info?: {
    description?: string;
    producer_name?: string;
  };
}

export interface RackDocument {
  _id: string;
  filename: string;
  rack_name: string;
  rack_type?: string;
  description?: string;
  producer_name?: string;
  created_at: string;
  analysis: RackAnalysis;
  stats: {
    total_chains: number;
    total_devices: number;
    macro_controls: number;
  };
  file_content?: string; // Base64 encoded original file
  is_favorited?: boolean; // Whether the current user has favorited this rack
  download_count?: number; // Number of times this rack has been downloaded
  is_public?: boolean; // Whether this rack is publicly visible
}

export interface AnalyzeResponse {
  success: boolean;
  analysis: RackAnalysis;
  filename: string;
  stats: {
    total_chains: number;
    total_devices: number;
    macro_controls: number;
  };
  rack_id: string;
  download_ids: {
    xml: string;
    json: string;
  };
}

// React Flow node types
export interface NodeData extends Record<string, unknown> {
  label: string;
  type: 'chain' | 'device' | 'macro';
  data: Chain | Device | MacroControl;
  isSelected?: boolean;
  // Chain highlighting properties
  chainId?: string;
  chainIndex?: number; 
  chainName?: string;
  chainColor?: string;
}

export interface RackFlowNode {
  id: string;
  type: 'chain' | 'device' | 'macro';
  position: { x: number; y: number };
  data: NodeData;
}

export interface RackFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
}