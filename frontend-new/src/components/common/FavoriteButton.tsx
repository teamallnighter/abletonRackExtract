import React from 'react';
import { useToggleFavorite } from '../../hooks/useUserProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface FavoriteButtonProps {
  rackId: string;
  isFavorited: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  rackId,
  isFavorited,
  size = 'md',
  showCount = false,
  count = 0,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  const toggleFavoriteMutation = useToggleFavorite();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if button is inside a link
    e.stopPropagation();

    if (!isAuthenticated) {
      showError('Authentication Required', 'Please log in to favorite racks');
      return;
    }

    try {
      await toggleFavoriteMutation.mutateAsync({ rackId, isFavorited });
      showSuccess(
        isFavorited ? 'Removed from favorites' : 'Added to favorites',
        isFavorited ? 'Rack removed from your favorites' : 'Rack added to your favorites'
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showError(
        'Failed to update favorite',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggleFavoriteMutation.isPending || !isAuthenticated}
      className={`
        inline-flex items-center space-x-1 rounded-full transition-all duration-200
        ${buttonClasses[size]}
        ${isFavorited 
          ? 'text-red-600 hover:text-red-700' 
          : 'text-gray-400 hover:text-red-500'
        }
        ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
        ${toggleFavoriteMutation.isPending ? 'animate-pulse' : ''}
        ${className}
      `}
      title={
        !isAuthenticated 
          ? 'Login to favorite racks' 
          : isFavorited 
            ? 'Remove from favorites' 
            : 'Add to favorites'
      }
    >
      {toggleFavoriteMutation.isPending ? (
        <div className={`${sizeClasses[size]} animate-spin`}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      ) : (
        <svg 
          className={sizeClasses[size]} 
          fill={isFavorited ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={isFavorited ? 0 : 2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
      
      {showCount && count > 0 && (
        <span className="text-xs font-medium">
          {count}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;