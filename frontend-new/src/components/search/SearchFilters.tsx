import React from 'react';
import Select from '../common/Select';

export interface SearchFilters {
  genre?: string;
  tags: string[];
  minDevices?: number;
  maxDevices?: number;
  sortBy: string;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClear: () => void;
}

const COMMON_GENRES = [
  'House', 'Techno', 'Deep House', 'Progressive House', 'Trance', 
  'Drum & Bass', 'Dubstep', 'Ambient', 'Electronica', 'Minimal',
  'Breakbeat', 'Synthwave', 'Future Bass', 'Trap'
];

const COMMON_TAGS = [
  'bass', 'lead', 'pad', 'pluck', 'drum', 'percussion', 'fx', 'reverb',
  'delay', 'chorus', 'distortion', 'filter', 'analog', 'digital', 'vintage',
  'modern', 'warm', 'cold', 'dark', 'bright', 'aggressive', 'smooth'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'complex', label: 'Most Complex' },
  { value: 'simple', label: 'Simplest First' },
  { value: 'name', label: 'Name A-Z' }
];

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear
}) => {
  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ tags: newTags });
  };

  const hasActiveFilters = filters.genre || filters.tags.length > 0 || 
    filters.minDevices || filters.maxDevices || filters.sortBy !== 'newest';

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <Select
          label="Sort By"
          value={filters.sortBy}
          onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
          options={SORT_OPTIONS.map(option => ({
            value: option.value,
            label: option.label
          }))}
          fullWidth
          size="md"
        />
      </div>

      {/* Genre */}
      <div>
        <Select
          label="Genre"
          value={filters.genre || ''}
          onChange={(e) => onFiltersChange({ genre: e.target.value || undefined })}
          placeholder="All Genres"
          options={[
            { value: '', label: 'All Genres' },
            ...COMMON_GENRES.map(genre => ({
              value: genre,
              label: genre
            }))
          ]}
          fullWidth
          size="md"
        />
      </div>

      {/* Device Count Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Devices
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="number"
              placeholder="Min"
              min="1"
              max="50"
              value={filters.minDevices || ''}
              onChange={(e) => onFiltersChange({ 
                minDevices: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Max"
              min="1"
              max="50"
              value={filters.maxDevices || ''}
              onChange={(e) => onFiltersChange({ 
                maxDevices: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tags ({filters.tags.length} selected)
        </label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {COMMON_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagToggle(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                filters.tags.includes(tag)
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
              {filters.tags.includes(tag) && (
                <span className="ml-1">×</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-2">
            {filters.genre && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Genre: {filters.genre}
                <button
                  onClick={() => onFiltersChange({ genre: undefined })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                #{tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            {(filters.minDevices || filters.maxDevices) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Devices: {filters.minDevices || 0}–{filters.maxDevices || '∞'}
                <button
                  onClick={() => onFiltersChange({ minDevices: undefined, maxDevices: undefined })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;