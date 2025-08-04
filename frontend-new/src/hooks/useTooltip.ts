import { useState, useCallback } from 'react';

interface TooltipState {
  visible: boolean;
  position: { x: number; y: number };
  data: any;
}

export const useTooltip = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    position: { x: 0, y: 0 },
    data: null
  });

  const showTooltip = useCallback((event: React.MouseEvent, data: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      position: {
        x: rect.right,
        y: rect.top + rect.height / 2
      },
      data
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const updateTooltipPosition = useCallback((event: React.MouseEvent) => {
    if (tooltip.visible) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip(prev => ({
        ...prev,
        position: {
          x: rect.right,
          y: rect.top + rect.height / 2
        }
      }));
    }
  }, [tooltip.visible]);

  return {
    tooltip,
    showTooltip,
    hideTooltip,
    updateTooltipPosition
  };
};