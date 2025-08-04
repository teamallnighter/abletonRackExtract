import { useState } from 'react';
import { useSearchRacksQuery, useRecentRacksQuery } from '../hooks/useRackQuery';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchFilters, { type SearchFilters as FilterType } from '../components/search/SearchFilters';
import FavoriteButton from '../components/common/FavoriteButton';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<FilterType>({
    tags: [],
    sortBy: 'newest'
  });
  
  const { isAuthenticated } = useAuth();
  const { data: searchResults, isLoading: searchLoading } = useSearchRacksQuery(debouncedQuery);
  const { data: recentRacks, isLoading: recentLoading } = useRecentRacksQuery(20);

  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce the search query
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const displayRacks = debouncedQuery ? searchResults : recentRacks;
  const isLoading = debouncedQuery ? searchLoading : recentLoading;

  const handleFiltersChange = (newFilters: Partial<FilterType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({ tags: [], sortBy: 'newest' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Discover Rack Recipes
            </h1>
            <p className="text-lg text-gray-600">
              Browse and search through the community's rack configurations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1">
              <SearchFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClear={clearFilters}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-4 lg:space-y-6">
              {/* Search Bar */}
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search racks by name, producer, or description..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-[44px] touch-manipulation"
                  />
                </div>
              </div>

              {/* Results Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {debouncedQuery ? (
                    <>Search Results for "{debouncedQuery}"</>
                  ) : (
                    'All Racks'
                  )}
                </h2>
                {displayRacks && (
                  <span className="text-gray-500">
                    {displayRacks.length} rack{displayRacks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results Grid */}
              {!isLoading && displayRacks && displayRacks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {displayRacks.map((rack) => (
                    <div
                      key={rack._id}
                      className="relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden group"
                    >
                      <Link to={`/rack/${rack._id}`} className="block p-4 sm:p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                            {rack.rack_name}
                          </h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {isAuthenticated && (
                              <FavoriteButton
                                rackId={rack._id}
                                isFavorited={rack.is_favorited || false}
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            )}
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {rack.description || 'No description provided'}
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{rack.stats.total_chains} chains</span>
                            <span>{rack.stats.total_devices} devices</span>
                            <span>{rack.stats.macro_controls} macros</span>
                          </div>
                          
                          {rack.producer_name && (
                            <p className="text-xs text-blue-600 font-medium">
                              by {rack.producer_name}
                            </p>
                          )}
                          
                          <p className="text-xs text-gray-400">
                            {new Date(rack.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                      
                      {/* Visual Indicator */}
                      <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600 group-hover:from-blue-500 group-hover:to-blue-700 transition-all"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!isLoading && displayRacks && displayRacks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {debouncedQuery ? (
                    <>
                      <p className="text-gray-500 mb-2">No results found for "{debouncedQuery}"</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search terms or filters</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-2">No racks available yet</p>
                      <p className="text-gray-400 text-sm">Be the first to upload a rack!</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;