import React from 'react';
import { useUpload } from '../hooks/useUpload';
import FileDropZone from '../components/upload/FileDropZone';
import MetadataForm from '../components/upload/MetadataForm';
import LazyRackVisualization from '../components/visualization/LazyRackVisualization';

const Upload: React.FC = () => {
  const {
    file,
    analysis,
    metadata,
    isAnalyzing,
    isSaving,
    analysisError,
    saveError,
    progress,
    setFile,
    setMetadata,
    analyzeFile,
    saveRack,
    reset,
  } = useUpload();

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

  const getStepNumber = () => {
    if (!file) return 1;
    if (!analysis) return 2;
    return 3;
  };

  const currentStep = getStepNumber();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Rack</h1>
            <p className="text-gray-600">
              Upload your Ableton rack to share with the producer community
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[
                { step: 1, label: 'Upload File', icon: '📁' },
                { step: 2, label: 'Analyze', icon: '🔍' },
                { step: 3, label: 'Add Details', icon: '✏️' },
              ].map(({ step, label, icon }) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step <= currentStep ? '✓' : step}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {icon} {label}
                  </span>
                  {step < 3 && (
                    <div className={`ml-4 w-8 h-0.5 ${
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
            {!file && (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Step 1: Upload Your Rack File
                </h2>
                <FileDropZone onFileSelect={handleFileSelect} />
              </div>
            )}

            {/* Step 2: Analysis */}
            {file && !analysis && (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Step 2: Analyze Your Rack
                  </h2>
                  <button
                    onClick={handleStartOver}
                    className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                  >
                    Start Over
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
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analysis Button */}
                <div className="text-center">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Analyzing Rack...
                      </div>
                    ) : (
                      'Analyze Rack Structure'
                    )}
                  </button>
                </div>

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
            )}

            {/* Step 3: Metadata and Preview */}
            {analysis && (
              <div className="space-y-8">
                {/* Rack Preview */}
                <div className="bg-white rounded-lg shadow-sm border p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Rack Preview
                  </h2>
                  <LazyRackVisualization />
                </div>

                {/* Metadata Form */}
                <div className="bg-white rounded-lg shadow-sm border p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Add Details & Publish
                  </h2>
                  <MetadataForm
                    metadata={metadata}
                    onMetadataChange={setMetadata}
                    disabled={isSaving}
                  />
                </div>

                {/* Save Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-8">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleStartOver}
                      className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Start Over
                    </button>
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Publishing...
                          </div>
                        ) : (
                          'Publish Rack'
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;