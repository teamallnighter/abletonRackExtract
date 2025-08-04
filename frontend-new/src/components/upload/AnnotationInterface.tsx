import React, { useState, useRef } from 'react';
import type { ComponentAnnotation } from '../../hooks/useEnhancedUpload';
import type { RackAnalysis } from '../../types/rack';

interface AnnotationInterfaceProps {
  analysis: RackAnalysis;
  annotations: ComponentAnnotation[];
  onAddAnnotation: (annotation: ComponentAnnotation) => void;
  onUpdateAnnotation: (id: string, updates: Partial<ComponentAnnotation>) => void;
  onRemoveAnnotation: (id: string) => void;
  disabled?: boolean;
}

interface AnnotationModal {
  isOpen: boolean;
  position: { x: number; y: number };
  componentId: string;
  componentType: 'chain' | 'device' | 'macro' | 'general';
  componentName: string;
  existingAnnotation?: ComponentAnnotation;
}

const AnnotationInterface: React.FC<AnnotationInterfaceProps> = ({
  analysis,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  disabled = false,
}) => {
  const [modal, setModal] = useState<AnnotationModal>({
    isOpen: false,
    position: { x: 0, y: 0 },
    componentId: '',
    componentType: 'general',
    componentName: '',
  });
  const [annotationContent, setAnnotationContent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleComponentClick = (
    componentId: string,
    componentType: 'chain' | 'device' | 'macro',
    componentName: string,
    event: React.MouseEvent
  ) => {
    if (disabled) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if there's an existing annotation for this component
    const existingAnnotation = annotations.find(ann => ann.component_id === componentId);

    setModal({
      isOpen: true,
      position: { x, y },
      componentId,
      componentType,
      componentName,
      existingAnnotation,
    });

    setAnnotationContent(existingAnnotation?.content || '');
  };

  const handleSaveAnnotation = () => {
    if (!annotationContent.trim()) return;

    const annotation: ComponentAnnotation = {
      type: modal.componentType,
      component_id: modal.componentId,
      position: modal.position,
      content: annotationContent.trim(),
    };

    if (modal.existingAnnotation?.id) {
      onUpdateAnnotation(modal.existingAnnotation.id, { content: annotation.content });
    } else {
      onAddAnnotation(annotation);
    }

    closeModal();
  };

  const handleDeleteAnnotation = () => {
    if (modal.existingAnnotation?.id) {
      onRemoveAnnotation(modal.existingAnnotation.id);
    }
    closeModal();
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      position: { x: 0, y: 0 },
      componentId: '',
      componentType: 'general',
      componentName: '',
    });
    setAnnotationContent('');
  };

  const renderChain = (chain: any, chainIndex: number) => {
    const chainId = `chain_${chainIndex}`;
    const hasAnnotation = annotations.some(ann => ann.component_id === chainId);

    return (
      <div key={chainIndex} className="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
        <div
          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
            hasAnnotation ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
          }`}
          onClick={(e) => handleComponentClick(chainId, 'chain', chain.name || `Chain ${chainIndex + 1}`, e)}
        >
          <h3 className="font-medium text-gray-900 flex items-center">
            🔗 {chain.name || `Chain ${chainIndex + 1}`}
            {hasAnnotation && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>}
          </h3>
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleComponentClick(chainId, 'chain', chain.name || `Chain ${chainIndex + 1}`, e);
            }}
          >
            {hasAnnotation ? 'Edit Note' : 'Add Note'}
          </button>
        </div>

        {/* Devices in chain */}
        <div className="mt-3 space-y-2">
          {(chain.devices || []).map((device: any, deviceIndex: number) => {
            const deviceId = `chain_${chainIndex}_device_${deviceIndex}`;
            const deviceHasAnnotation = annotations.some(ann => ann.component_id === deviceId);

            return (
              <div
                key={deviceIndex}
                className={`flex items-center justify-between p-2 ml-4 rounded cursor-pointer transition-colors ${
                  deviceHasAnnotation ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                }`}
                onClick={(e) => handleComponentClick(deviceId, 'device', device.name || `Device ${deviceIndex + 1}`, e)}
              >
                <span className="text-gray-700 flex items-center">
                  📱 {device.name || `Device ${deviceIndex + 1}`}
                  {deviceHasAnnotation && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>}
                </span>
                <button
                  type="button"
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComponentClick(deviceId, 'device', device.name || `Device ${deviceIndex + 1}`, e);
                  }}
                >
                  {deviceHasAnnotation ? 'Edit' : 'Annotate'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMacroControls = () => {
    const macros = analysis.macro_controls || [];
    if (macros.length === 0) return null;

    return (
      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
        <h3 className="font-medium text-gray-900 mb-3">🎛️ Macro Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {macros.map((macro: any, macroIndex: number) => {
            const macroId = `macro_${macroIndex}`;
            const hasAnnotation = annotations.some(ann => ann.component_id === macroId);

            return (
              <div
                key={macroIndex}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  hasAnnotation ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                }`}
                onClick={(e) => handleComponentClick(macroId, 'macro', macro.name || `Macro ${macroIndex + 1}`, e)}
              >
                <span className="text-gray-700 flex items-center">
                  {macro.name || `Macro ${macroIndex + 1}`}
                  {hasAnnotation && <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full"></span>}
                </span>
                <button
                  type="button"
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComponentClick(macroId, 'macro', macro.name || `Macro ${macroIndex + 1}`, e);
                  }}
                >
                  {hasAnnotation ? 'Edit' : 'Annotate'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Interactive Annotation</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Chains
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Devices
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Macros
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          💡 Click on any component below to add helpful notes and instructions. 
          Your annotations will help other producers understand how to use your rack effectively.
        </p>
      </div>

      {/* Interactive Rack Structure */}
      <div ref={containerRef} className="space-y-4">
        {/* Macro Controls */}
        {renderMacroControls()}

        {/* Chains and Devices */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Signal Chains</h3>
          {(analysis.chains || []).map((chain, index) => renderChain(chain, index))}
        </div>
      </div>

      {/* Annotation Summary */}
      {annotations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            📝 Your Annotations ({annotations.length})
          </h4>
          <div className="space-y-2">
            {annotations.map((annotation, index) => (
              <div key={annotation.id || index} className="text-sm">
                <span className="font-medium text-blue-800">
                  {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}:
                </span>
                <span className="text-blue-700 ml-1">
                  {annotation.content.length > 50 
                    ? `${annotation.content.substring(0, 50)}...` 
                    : annotation.content
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotation Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {modal.existingAnnotation ? 'Edit' : 'Add'} Annotation
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Component:</span> {modal.componentName}
                </p>
                <p className="text-sm text-gray-500">
                  Add helpful notes, usage tips, or technical details about this component.
                </p>
              </div>

              <div className="mb-6">
                <textarea
                  value={annotationContent}
                  onChange={(e) => setAnnotationContent(e.target.value)}
                  placeholder="Enter your annotation here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {modal.existingAnnotation && (
                    <button
                      onClick={handleDeleteAnnotation}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete Annotation
                    </button>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAnnotation}
                    disabled={!annotationContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {modal.existingAnnotation ? 'Update' : 'Save'} Annotation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationInterface;