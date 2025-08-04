import { useRef, useState } from 'react';
import { useAnalyzeRackMutation, useRecentRacksQuery } from '../hooks/useRackQuery';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FavoriteButton from '../components/common/FavoriteButton';

const HomePage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [description, setDescription] = useState('');
  const [producerName, setProducerName] = useState('');
  
  const { isAuthenticated } = useAuth();
  const analyzeRackMutation = useAnalyzeRackMutation();
  const { data: recentRacks, isLoading: loadingRacks } = useRecentRacksQuery(8);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    if (file && (file.name.endsWith('.adg') || file.name.endsWith('.adv'))) {
      analyzeRackMutation.mutate({ file, description, producerName });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Navigate to rack visualization when analysis completes
  if (analyzeRackMutation.isSuccess && analyzeRackMutation.data) {
    navigate(`/rack/${analyzeRackMutation.data.rack_id}`);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Visualize Your Ableton Racks
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Transform complex rack structures into clear, professional diagrams. 
          Upload your .adg or .adv files and explore your signal flow like never before.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-4 sm:p-8">
        <div
          className={`relative transition-all duration-200 ${dragActive ? 'border-blue-400 bg-blue-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Drop your rack file here
              </h3>
              <p className="text-gray-500">
                or click to browse for .adg or .adv files
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Producer name (optional)"
                value={producerName}
                onChange={(e) => setProducerName(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px] touch-manipulation"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[44px] touch-manipulation"
              />
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzeRackMutation.isPending}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 touch-manipulation min-h-[48px]"
            >
              {analyzeRackMutation.isPending ? 'Analyzing...' : 'Choose File'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".adg,.adv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {analyzeRackMutation.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{analyzeRackMutation.error.message}</p>
          </div>
        )}
      </div>

      {/* Recent Racks Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Recent Racks</h2>
          <Link to="/search" className="text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>

        {loadingRacks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recentRacks?.slice(0, 8).map((rack) => (
              <div key={rack._id} className="relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden group">
                <Link to={`/rack/${rack._id}`} className="block p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                      {rack.rack_name}
                    </h3>
                    {isAuthenticated && (
                      <div className="flex-shrink-0">
                        <FavoriteButton
                          rackId={rack._id}
                          isFavorited={rack.is_favorited || false}
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {rack.description || 'No description'}
                  </p>
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{rack.stats.total_chains} chains</span>
                    <span>{rack.stats.total_devices} devices</span>
                  </div>
                  {rack.producer_name && (
                    <p className="text-xs text-blue-600">
                      by {rack.producer_name}
                    </p>
                  )}
                </Link>
                <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600 group-hover:from-blue-500 group-hover:to-blue-700 transition-all"></div>
              </div>
            ))}
          </div>
        )}

        {recentRacks && recentRacks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500">No racks have been analyzed yet.</p>
            <p className="text-gray-400 text-sm">Upload your first rack file to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;