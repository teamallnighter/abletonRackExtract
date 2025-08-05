import React from 'react';
import { useEnhancedUpload } from '../hooks/useEnhancedUpload';
import FileDropZone from '../components/upload/FileDropZone';
import EnhancedMetadataForm from '../components/upload/EnhancedMetadataForm';
import AnnotationInterface from '../components/upload/AnnotationInterface';
import LazyRackVisualization from '../components/visualization/LazyRackVisualization';

const EnhancedUpload: React.FC = () => {
  const {
    file,
    analysis,
    metadata,
    annotations,
    autoTags,
    complexityScore,
    currentStep,
    isAnalyzing,
    isSaving,
    analysisError,
    saveError,
    progress,
    setFile,
    setMetadata,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    nextStep,
    prevStep,
    analyzeFile,
    saveRack,
    reset,
    applySuggestedTags,
  } = useEnhancedUpload();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleAnalyze = () => {
    analyzeFile();
  };

  const handleSave = () => {
    saveRack();
  };

  const handleStartOver = () => {
    reset();
  };

  const steps = [
    { step: 1, label: 'Upload File', icon: '📁', description: 'Select your .adg/.adv file' },
    { step: 2, label: 'Analyze', icon: '🔍', description: 'Analyze rack structure' },
    { step: 3, label: 'Add Details', icon: '✏️', description: 'Add metadata and description' },
    { step: 4, label: 'Annotate', icon: '💬', description: 'Add helpful annotations' },
  ];

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return !!file;
      case 2: return !!analysis;
      case 3: return !!metadata.title?.trim();
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Share Your Ableton Rack
            </h1>
            <p className="text-gray-600">
              Upload, annotate, and share your Ableton Live racks with the producer community
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 lg:space-x-8">
              {steps.map(({ step, label, icon, description }, index) => (
                <div key={step} className="flex items-center">
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        step <= currentStep
                          ? 'bg-blue-600 text-white border border-blue-600 font-medium shadow-sm shadow-lg scale-110'
                          : step === currentStep + 1
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step < currentStep ? '✓' : icon}
                    </div>
                    <div className="mt-2">
                      <div className={`text-sm font-medium ${
                        step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">
                        {description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`mx-2 lg:mx-4 w-8 lg:w-16 h-0.5 transition-colors ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Step 1: File Upload */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Step 1: Upload Your Rack File
                </h2>
                <FileDropZone onFileSelect={handleFileSelect} />
                
                {file && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-600">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={nextStep}
                        className="bg-blue-600 text-white border border-blue-600 font-medium shadow-sm px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Analysis */}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Step 2: Analyze Your Rack
                  </h2>
                  <button
                    onClick={prevStep}
                    className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                  >
                    ← Back
                  </button>
                </div>

                {/* File Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file?.name}</p>
                      <p className="text-sm text-gray-600">
                        {file ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analysis Button or Results */}
                {!analysis ? (
                  <div className="text-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="bg-blue-600 text-white border border-blue-600 font-medium shadow-sm px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Analyzing Rack Structure...
                        </div>
                      ) : (
                        'Analyze Rack Structure'
                      )}
                    </button>

                    {/* Progress Bar */}
                    {isAnalyzing && progress > 0 && (
                      <div className="mt-6">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Analysis Error */}
                    {analysisError && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-800 font-medium">Analysis Failed</p>
                        </div>
                        <p className="text-red-700 mt-1">{analysisError}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Analysis Success */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-green-800 font-medium">Analysis Complete!</p>
                      </div>
                      <p className="text-green-700 mt-1">
                        Found {analysis.chains?.length || 0} chains, {autoTags.length} device types
                      </p>
                    </div>

                    {/* Continue Button */}
                    <div className="text-center">
                      <button
                        onClick={nextStep}
                        className="bg-blue-600 text-white border border-blue-600 font-medium shadow-sm px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Metadata →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Metadata */}
            {currentStep === 3 && analysis && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Metadata Form */}
                <div className="bg-white rounded-lg shadow-sm border p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Step 3: Add Details
                    </h2>
                    <button
                      onClick={prevStep}
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                      ← Back
                    </button>
                  </div>

                  <EnhancedMetadataForm
                    metadata={metadata}
                    onMetadataChange={setMetadata}
                    autoTags={autoTags}
                    complexityScore={complexityScore}
                    onApplySuggestedTags={applySuggestedTags}
                    disabled={isSaving}
                  />

                  {/* Navigation */}
                  <div className="mt-8 flex justify-between">
                    <button
                      onClick={prevStep}
                      className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      ← Previous Step
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={!canProceedToNextStep()}
                      className="bg-blue-600 text-white border border-blue-600 font-medium shadow-sm px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Continue to Annotations →
                    </button>
                  </div>
                </div>

                {/* Rack Preview */}
                <div className="bg-white rounded-lg shadow-sm border p-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Rack Preview
                  </h3>
                  <LazyRackVisualization />
                </div>
              </div>
            )}

            {/* Step 4: Annotations */}
            {currentStep === 4 && analysis && (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Step 4: Add Annotations (Optional)
                  </h2>
                  <button
                    onClick={prevStep}
                    className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                  >
                    ← Back
                  </button>
                </div>

                <AnnotationInterface
                  analysis={analysis}
                  annotations={annotations}
                  onAddAnnotation={addAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onRemoveAnnotation={removeAnnotation}
                  disabled={isSaving}
                />

                {/* Final Actions */}
                <div className="mt-8 flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                  <div>
                    <button
                      onClick={handleStartOver}
                      className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Start Over
                    </button>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={prevStep}
                      className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      ← Previous Step
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !metadata.title?.trim()}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                    >
                      {isSaving ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Publishing Rack...
                        </div>
                      ) : (
                        'Publish Rack 🚀'
                      )}
                    </button>
                  </div>
                </div>

                {/* Save Error */}
                {saveError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-800 font-medium">Publishing Failed</p>
                    </div>
                    <p className="text-red-700 mt-1">{saveError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedUpload;