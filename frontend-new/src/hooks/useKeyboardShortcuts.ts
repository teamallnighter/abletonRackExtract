import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useRackStore } from '../stores/rackStore';

export const useKeyboardShortcuts = () => {
  const reactFlowInstance = useReactFlow();
  const { 
    selectedNodeId, 
    setSelectedNode, 
    toggleMacroControls, 
    toggleDeviceDetails,
    nodes 
  } = useRackStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'escape':
          setSelectedNode(null);
          break;
          
        case 'm':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleMacroControls();
          }
          break;
          
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleDeviceDetails();
          }
          break;
          
        case 'arrowdown':
        case 'arrowup':
          if (selectedNodeId && nodes.length > 0) {
            event.preventDefault();
            const currentIndex = nodes.findIndex(node => node.id === selectedNodeId);
            if (currentIndex !== -1) {
              const direction = event.key === 'arrowdown' ? 1 : -1;
              const nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
              setSelectedNode(nodes[nextIndex].id);
            }
          }
          break;
          
        case ' ':
          if (selectedNodeId) {
            event.preventDefault();
            // Space to deselect current node
            setSelectedNode(null);
          }
          break;
          
        case 'f':
          event.preventDefault();
          reactFlowInstance.fitView({ padding: 0.1, duration: 800 });
          break;
          
        case 'c':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            if (nodes.length > 0) {
              const bounds = {
                x: Math.min(...nodes.map(n => n.position.x)),
                y: Math.min(...nodes.map(n => n.position.y)),
                width: Math.max(...nodes.map(n => n.position.x + 150)) - Math.min(...nodes.map(n => n.position.x)),
                height: Math.max(...nodes.map(n => n.position.y + 60)) - Math.min(...nodes.map(n => n.position.y))
              };
              const centerX = bounds.x + bounds.width / 2;
              const centerY = bounds.y + bounds.height / 2;
              reactFlowInstance.setCenter(centerX, centerY, { duration: 500 });
            }
          }
          break;
          
        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 });
          }
          break;
          
        case '=':
        case '+':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            reactFlowInstance.zoomIn({ duration: 300 });
          }
          break;
          
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            reactFlowInstance.zoomOut({ duration: 300 });
          }
          break;
          
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, setSelectedNode, toggleMacroControls, toggleDeviceDetails, nodes, reactFlowInstance]);
};

export const KEYBOARD_SHORTCUTS = [
  { key: 'Esc', description: 'Deselect node' },
  { key: 'Space', description: 'Deselect current node' },
  { key: '↑/↓', description: 'Navigate between nodes' },
  { key: 'F', description: 'Fit to view' },
  { key: 'C', description: 'Center view' },
  { key: 'R', description: 'Reset view' },
  { key: 'Ctrl/⌘ +', description: 'Zoom in' },
  { key: 'Ctrl/⌘ -', description: 'Zoom out' },
  { key: 'Ctrl+M', description: 'Toggle macro controls' },
  { key: 'Ctrl+D', description: 'Toggle device details' },
];