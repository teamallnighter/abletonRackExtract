// Zustand store for rack visualization state
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RackDocument, RackFlowNode, RackFlowEdge } from '../types/rack';

interface RackState {
  // Current rack data
  currentRack: RackDocument | null;
  
  // Visualization state
  selectedNodeId: string | null;
  zoomLevel: number;
  viewportPosition: { x: number; y: number };
  
  // Flow diagram data
  nodes: RackFlowNode[];
  edges: RackFlowEdge[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showMacroControls: boolean;
  showDeviceDetails: boolean;
  
  // Actions
  setCurrentRack: (rack: RackDocument | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setViewport: (zoom: number, position: { x: number; y: number }) => void;
  setNodes: (nodes: RackFlowNode[]) => void;
  setEdges: (edges: RackFlowEdge[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleMacroControls: () => void;
  toggleDeviceDetails: () => void;
  reset: () => void;
}

const initialState = {
  currentRack: null,
  selectedNodeId: null,
  zoomLevel: 1,
  viewportPosition: { x: 0, y: 0 },
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,
  showMacroControls: true,
  showDeviceDetails: true,
};

export const useRackStore = create<RackState>()(
  immer((set) => ({
    ...initialState,
    
    setCurrentRack: (rack) => set((state) => {
      state.currentRack = rack;
      state.error = null;
    }),
    
    setSelectedNode: (nodeId) => set((state) => {
      state.selectedNodeId = nodeId;
    }),
    
    setViewport: (zoom, position) => set((state) => {
      state.zoomLevel = zoom;
      state.viewportPosition = position;
    }),
    
    setNodes: (nodes) => set((state) => {
      state.nodes = nodes;
    }),
    
    setEdges: (edges) => set((state) => {
      state.edges = edges;
    }),
    
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),
    
    setError: (error) => set((state) => {
      state.error = error;
      state.isLoading = false;
    }),
    
    toggleMacroControls: () => set((state) => {
      state.showMacroControls = !state.showMacroControls;
    }),
    
    toggleDeviceDetails: () => set((state) => {
      state.showDeviceDetails = !state.showDeviceDetails;
    }),
    
    reset: () => set((state) => {
      Object.assign(state, initialState);
    }),
  }))
);