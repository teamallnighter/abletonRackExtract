import React, { useState } from 'react';
import type { EnhancedUploadMetadata } from '../../hooks/useEnhancedUpload';

interface EnhancedMetadataFormProps {
  metadata: EnhancedUploadMetadata;
  onMetadataChange: (metadata: Partial<EnhancedUploadMetadata>) => void;
  autoTags: string[];
  complexityScore: number;
  onApplySuggestedTags: () => void;
  disabled?: boolean;
}

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', description: 'Simple structure, few devices' },
  { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity' },
  { value: 'advanced', label: 'Advanced', description: 'Complex routing, many devices' },
];

const COPYRIGHT_OPTIONS = [
  'All rights reserved',
  'Creative Commons - Attribution',
  'Creative Commons - Attribution-ShareAlike',
  'Creative Commons - Attribution-NonCommercial',
  'Public Domain',
  'Custom'
];

const EnhancedMetadataForm: React.FC<EnhancedMetadataFormProps> = ({
  metadata,
  onMetadataChange,
  autoTags,
  complexityScore,
  onApplySuggestedTags,
  disabled = false,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [customCopyright, setCustomCopyright] = useState('');

  const handleInputChange = (field: keyof EnhancedUploadMetadata, value: string | number | undefined) => {
    onMetadataChange({ [field]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags?.includes(tagInput.trim())) {
      const newTags = [...(metadata.tags || []), tagInput.trim()];
      onMetadataChange({ tags: newTags });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = metadata.tags?.filter(tag => tag !== tagToRemove) || [];
    onMetadataChange({ tags: newTags });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!metadata.tags?.includes(tag)) {
      const newTags = [...(metadata.tags || []), tag];
      onMetadataChange({ tags: newTags });
    }
  };

  const getComplexityColor = (score: number) => {
    if (score < 25) return 'text-green-600 bg-green-100';
    if (score < 50) return 'text-yellow-600 bg-yellow-100';
    if (score < 75) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getComplexityLabel = (score: number) => {
    if (score < 25) return 'Simple';
    if (score < 50) return 'Moderate';
    if (score < 75) return 'Complex';
    return 'Very Complex';
  };

  return (
    <div className="space-y-8">
      {/* Title and Description */}
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={metadata.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            disabled={disabled}
            required
            className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-gray-100 disabled:text-gray-500 text-gray-900 transition-colors"
            placeholder="Give your rack a memorable name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={metadata.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-gray-100 disabled:text-gray-500 text-gray-900 transition-colors"
            placeholder="Describe your rack - what does it do? What style is it? How should it be used? Any special techniques or tips?"
          />
        </div>
      </div>


      {/* Difficulty Level */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          Difficulty Level
          <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getComplexityColor(complexityScore)}`}>
            Complexity: {getComplexityLabel(complexityScore)} ({complexityScore}/100)
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DIFFICULTIES.map(({ value, label, description }) => (
            <label
              key={value}
              className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                metadata.difficulty === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="difficulty"
                value={value}
                checked={metadata.difficulty === value}
                onChange={(e) => handleInputChange('difficulty', e.target.value as any)}
                disabled={disabled}
                className="sr-only"
              />
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-700 mt-1">{description}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
        
        {/* Auto-suggested tags */}
        {autoTags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Suggested tags from your rack:</p>
              <button
                type="button"
                onClick={onApplySuggestedTags}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Add all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {autoTags.slice(0, 10).map((tag, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAddSuggestedTag(tag)}
                  disabled={disabled || metadata.tags?.includes(tag)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    metadata.tags?.includes(tag)
                      ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                  {metadata.tags?.includes(tag) && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual tag input */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
              placeholder="Add custom tags (e.g., vintage, analog, polyrhythm)"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={disabled || !tagInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          {/* Current tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">License & Copyright</h3>
        <div className="space-y-3">
          <select
            value={metadata.copyright === customCopyright && customCopyright ? 'Custom' : metadata.copyright || ''}
            onChange={(e) => {
              if (e.target.value === 'Custom') {
                handleInputChange('copyright', customCopyright);
              } else {
                handleInputChange('copyright', e.target.value);
                setCustomCopyright('');
              }
            }}
            disabled={disabled}
            className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-gray-900 transition-colors"
          >
            <option value="">Select License</option>
            {COPYRIGHT_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          {(metadata.copyright === customCopyright && customCopyright) || metadata.copyright === 'Custom' ? (
            <input
              type="text"
              value={customCopyright}
              onChange={(e) => {
                setCustomCopyright(e.target.value);
                handleInputChange('copyright', e.target.value);
              }}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-gray-100 disabled:text-gray-500 text-gray-900 transition-colors"
              placeholder="Enter custom license/copyright information"
            />
          ) : null}
        </div>
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for maximum impact</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use a descriptive title that explains what your rack does</li>
          <li>• Include setup instructions and creative use cases in the description</li>
          <li>• Tag with instrument types, mood, and unique characteristics</li>
          <li>• Set appropriate difficulty level to help beginners vs. advanced users find suitable content</li>
          <li>• Choose a clear license so others know how they can use your work</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedMetadataForm;