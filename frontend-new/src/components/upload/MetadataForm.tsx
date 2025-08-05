import React, { useState } from 'react';
import type { UploadMetadata } from '../../hooks/useUpload';

interface MetadataFormProps {
  metadata: UploadMetadata;
  onMetadataChange: (metadata: Partial<UploadMetadata>) => void;
  disabled?: boolean;
}

const COMMON_GENRES = [
  'House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'Ambient', 
  'Electronica', 'Deep House', 'Progressive', 'Minimal', 'Breakbeat',
  'Synthwave', 'Future Bass', 'Trap', 'Chillout', 'Downtempo'
];

const COMMON_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
];

const MetadataForm: React.FC<MetadataFormProps> = ({
  metadata,
  onMetadataChange,
  disabled = false,
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (field: keyof UploadMetadata, value: string | number | undefined) => {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={metadata.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
            placeholder="Describe your rack - what does it do? What style is it? How should it be used?"
          />
        </div>

        {/* Producer Name */}
        <div>
          <label htmlFor="producer-name" className="block text-sm font-medium text-text-secondary mb-2">
            Producer Name
          </label>
          <input
            id="producer-name"
            type="text"
            value={metadata.producer_name || ''}
            onChange={(e) => handleInputChange('producer_name', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
            placeholder="Your producer name or alias"
          />
        </div>

        {/* Genre */}
        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-text-secondary mb-2">
            Genre
          </label>
          <div className="relative">
            <input
              id="genre"
              type="text"
              list="genres"
              value={metadata.genre || ''}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
              placeholder="Electronic music genre"
            />
            <datalist id="genres">
              {COMMON_GENRES.map(genre => (
                <option key={genre} value={genre} />
              ))}
            </datalist>
          </div>
        </div>

        {/* BPM */}
        <div>
          <label htmlFor="bpm" className="block text-sm font-medium text-text-secondary mb-2">
            BPM
          </label>
          <input
            id="bpm"
            type="number"
            min="60"
            max="200"
            value={metadata.bpm || ''}
            onChange={(e) => handleInputChange('bpm', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
            placeholder="120"
          />
        </div>

        {/* Key */}
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-text-secondary mb-2">
            Key
          </label>
          <div className="relative">
            <input
              id="key"
              type="text"
              list="keys"
              value={metadata.key || ''}
              onChange={(e) => handleInputChange('key', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
              placeholder="C major, Am, etc."
            />
            <datalist id="keys">
              {COMMON_KEYS.map(key => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Tags
        </label>
        <div className="space-y-3">
          {/* Tag Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled text-text-primary transition-colors"
              placeholder="Add tags (e.g., bass, synth, pad, lead)"
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

          {/* Tag Display */}
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

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for better discoverability</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use descriptive tags that producers would search for</li>
          <li>• Include the instrument types (bass, lead, pad, drum, etc.)</li>
          <li>• Mention the mood or energy (dark, uplifting, minimal, etc.)</li>
          <li>• Add any unique characteristics (vintage, analog, digital, etc.)</li>
        </ul>
      </div>
    </div>
  );
};

export default MetadataForm;