import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useRackStore } from '../stores/rackStore';

export const useRackExport = () => {
  const { currentRack } = useRackStore();

  const exportToPNG = useCallback(async (reactFlowInstance: any) => {
    if (!reactFlowInstance || !currentRack) return;

    try {
      const viewport = reactFlowInstance.getViewport();
      
      // Fit view to show all nodes before export
      reactFlowInstance.fitView({ padding: 0.1 });
      
      // Wait for the viewport to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Find the React Flow element
      const reactFlowElement = document.querySelector('.react-flow');
      if (!reactFlowElement) {
        throw new Error('React Flow element not found');
      }

      // Create canvas from the React Flow element
      const canvas = await html2canvas(reactFlowElement as HTMLElement, {
        backgroundColor: '#f8fafc',
        width: 800,
        height: 600,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      });

      // Restore original viewport
      reactFlowInstance.setViewport(viewport);

      // Create download link
      const link = document.createElement('a');
      link.download = `${currentRack.rack_name || 'rack'}-diagram.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      return true;
    } catch (error) {
      console.error('Export to PNG failed:', error);
      return false;
    }
  }, [currentRack]);

  const exportToSVG = useCallback(async (reactFlowInstance: any) => {
    if (!reactFlowInstance || !currentRack) return;

    try {
      const nodes = reactFlowInstance.getNodes();
      const edges = reactFlowInstance.getEdges();
      
      // Calculate bounds of all nodes manually
      const nodesBounds = nodes.reduce((bounds: any, node: any) => ({
        x: Math.min(bounds?.x || node.position.x, node.position.x),
        y: Math.min(bounds?.y || node.position.y, node.position.y),
        width: Math.max(bounds?.width || 0, node.position.x + (node.width || 150)),
        height: Math.max(bounds?.height || 0, node.position.y + (node.height || 60))
      }), {});
      
      nodesBounds.width = nodesBounds.width - nodesBounds.x;
      nodesBounds.height = nodesBounds.height - nodesBounds.y;
      
      const padding = 50;
      
      const svgWidth = nodesBounds.width + padding * 2;
      const svgHeight = nodesBounds.height + padding * 2;
      
      // Create SVG content
      let svgContent = `
        <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              .node-text { font-family: 'Inter', sans-serif; font-size: 12px; }
              .node-title { font-weight: 600; }
              .node-subtitle { font-weight: 400; opacity: 0.7; }
            </style>
          </defs>
          <rect width="100%" height="100%" fill="#f8fafc"/>
      `;

      // Add edges
      edges.forEach((edge: any) => {
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        const targetNode = nodes.find((n: any) => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const sourceX = sourceNode.position.x + (sourceNode.width || 150) / 2 - nodesBounds.x + padding;
          const sourceY = sourceNode.position.y + (sourceNode.height || 60) - nodesBounds.y + padding;
          const targetX = targetNode.position.x + (targetNode.width || 150) / 2 - nodesBounds.x + padding;
          const targetY = targetNode.position.y - nodesBounds.y + padding;
          
          svgContent += `
            <line x1="${sourceX}" y1="${sourceY}" x2="${targetX}" y2="${targetY}"
                  stroke="${edge.style?.stroke || '#10b981'}" 
                  stroke-width="${edge.style?.strokeWidth || 2}"
                  ${edge.style?.strokeDasharray ? `stroke-dasharray="${edge.style.strokeDasharray}"` : ''}/>
          `;
        }
      });

      // Add nodes
      nodes.forEach((node: any) => {
        const x = node.position.x - nodesBounds.x + padding;
        const y = node.position.y - nodesBounds.y + padding;
        const width = node.width || 150;
        const height = node.height || 60;
        
        let fillColor = '#ffffff';
        let borderColor = '#e5e7eb';
        
        if (node.type === 'chain') fillColor = '#dbeafe';
        if (node.type === 'device') fillColor = '#f0fdf4';
        if (node.type === 'macro') fillColor = '#fef3c7';
        
        svgContent += `
          <rect x="${x}" y="${y}" width="${width}" height="${height}"
                fill="${fillColor}" stroke="${borderColor}" stroke-width="2" rx="6"/>
          <text x="${x + 10}" y="${y + 20}" class="node-text node-title" fill="#1f2937">
            ${node.data.label}
          </text>
        `;
        
        if (node.type === 'device' && node.data.data.preset_name) {
          svgContent += `
            <text x="${x + 10}" y="${y + 35}" class="node-text node-subtitle" fill="#6b7280">
              ${node.data.data.preset_name}
            </text>
          `;
        }
      });

      svgContent += '</svg>';

      // Create download link
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `${currentRack.rack_name || 'rack'}-diagram.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);

      return true;
    } catch (error) {
      console.error('Export to SVG failed:', error);
      return false;
    }
  }, [currentRack]);

  const exportToJSON = useCallback(() => {
    if (!currentRack) return;

    try {
      const exportData = {
        rack_name: currentRack.rack_name,
        analysis: currentRack.analysis,
        stats: currentRack.stats,
        exported_at: new Date().toISOString(),
        exported_by: 'Ableton Cookbook'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const link = document.createElement('a');
      link.download = `${currentRack.rack_name || 'rack'}-analysis.json`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);

      return true;
    } catch (error) {
      console.error('Export to JSON failed:', error);
      return false;
    }
  }, [currentRack]);

  return {
    exportToPNG,
    exportToSVG,
    exportToJSON,
    canExport: !!currentRack
  };
};