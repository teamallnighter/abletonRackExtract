import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, useUserStats, useUserRacks, useUserFavorites, useDeleteRack } from '../hooks/useUserProfile';

type TabType = 'overview' | 'uploads' | 'favorites' | 'settings';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { isLoading: profileLoading } = useUserProfile();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: userRacks, isLoading: racksLoading } = useUserRacks();
  const { data: favorites, isLoading: favoritesLoading } = useUserFavorites();
  const deleteRackMutation = useDeleteRack();

  const handleDeleteRack = async (rackId: string, rackName: string) => {
    if (window.confirm(`Are you sure you want to delete "${rackName}"? This action cannot be undone.`)) {
      try {
        await deleteRackMutation.mutateAsync(rackId);
        // Success feedback would be handled by toast system
      } catch (error) {
        console.error('Failed to delete rack:', error);
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'uploads', label: 'My Racks', icon: '🎵', count: stats?.uploadsCount },
    { id: 'favorites', label: 'Favorites', icon: '❤️', count: stats?.favoritesCount },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  // Show loading only for critical data (profile)
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-300 rounded w-32"></div>
                    <div className="h-4 bg-gray-300 rounded w-48"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{user?.username}</h1>
                <p className="text-gray-600 mt-1">{user?.email}</p>

                <div className="flex flex-wrap gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statsLoading ? (
                        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        stats?.uploadsCount ?? 0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Racks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {statsLoading ? (
                        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        stats?.favoritesCount ?? 0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statsLoading ? (
                        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        stats?.totalDownloads ?? 0
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Downloads</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-4">
                  <span className="text-sm text-gray-500">
                    Member since {statsLoading ? (
                      <span className="inline-block w-16 h-3 bg-gray-200 rounded animate-pulse"></span>
                    ) : stats?.memberSince ? (
                      new Date(stats.memberSince).toLocaleDateString()
                    ) : (
                      'N/A'
                    )}
                  </span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="text-sm text-gray-500">
                    Last active {statsLoading ? (
                      <span className="inline-block w-12 h-3 bg-gray-200 rounded animate-pulse"></span>
                    ) : stats?.lastActive ? (
                      new Date(stats.lastActive).toLocaleDateString()
                    ) : (
                      'Today'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Link
                  to="/upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Upload Rack</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {'count' in tab && tab.count !== undefined && (
                        <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                          {tab.count}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Quick Stats Cards */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6-12 6z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Total Uploads</p>
                          <p className="text-2xl font-bold text-blue-900">{stats?.uploadsCount || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-red-600">Favorites</p>
                          <p className="text-2xl font-bold text-red-900">{stats?.favoritesCount || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">Total Downloads</p>
                          <p className="text-2xl font-bold text-green-900">{stats?.totalDownloads || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-500">Activity feed coming soon</p>
                    </div>
                  </div>
                </div>
              )}

              {/* My Racks Tab */}
              {activeTab === 'uploads' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Your Uploaded Racks</h3>
                    <Link
                      to="/upload"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Upload New</span>
                    </Link>
                  </div>

                  {racksLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                          <div className="h-5 bg-gray-200 rounded mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : userRacks && userRacks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userRacks.map((rack) => (
                        <div key={rack._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden group">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 truncate">{rack.rack_name}</h4>
                              <div className="flex items-center space-x-2">
                                {!rack.is_public && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Private</span>
                                )}
                                <div className="relative">
                                  <button className="text-gray-400 hover:text-gray-600 p-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {rack.description || 'No description provided'}
                            </p>

                            <div className="space-y-3">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{rack.stats.total_chains} chains</span>
                                <span>{rack.stats.total_devices} devices</span>
                                <span>{rack.download_count} downloads</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  {new Date(rack.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex space-x-2">
                                  <Link
                                    to={`/rack/${rack._id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => handleDeleteRack(rack._id, rack.rack_name)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    disabled={deleteRackMutation.isPending}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600 group-hover:from-blue-500 group-hover:to-blue-700 transition-all"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6-12 6z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No racks uploaded yet</h3>
                      <p className="text-gray-600 mb-4">Share your first rack with the community!</p>
                      <Link
                        to="/upload"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Upload Your First Rack</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Favorites Tab */}
              {activeTab === 'favorites' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Your Favorite Racks</h3>

                  {favoritesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                          <div className="h-5 bg-gray-200 rounded mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : favorites && favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {favorites.map((rack) => (
                        <Link
                          key={rack._id}
                          to={`/rack/${rack._id}`}
                          className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 overflow-hidden group"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {rack.rack_name}
                              </h4>
                              <div className="text-red-500">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
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

                              <div className="text-xs text-gray-400">
                                Added {new Date(rack.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="h-1 bg-gradient-to-r from-red-400 to-red-600 group-hover:from-red-500 group-hover:to-red-700 transition-all"></div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
                      <p className="text-gray-600 mb-4">Start exploring and save racks you love!</p>
                      <Link
                        to="/search"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Discover Racks</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-500">Settings panel coming soon</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;