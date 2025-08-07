import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../services/auth';
import type { User } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';

interface UserStats {
  uploadsCount: number;
  favoritesCount: number;
  totalDownloads: number;
  memberSince: string;
  lastActive: string;
}

interface UserRack {
  _id: string;
  rack_name: string;
  description?: string;
  genre?: string;
  tags: string[];
  stats: {
    total_chains: number;
    total_devices: number;
    macro_controls: number;
  };
  created_at: string;
  download_count: number;
  is_public: boolean;
}

export const useUserProfile = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async (): Promise<User | null> => {
      if (!isAuthenticated) return null;
      const response = await fetch('/api/user/profile', {
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        // It's okay for this to fail if the user is not logged in
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
    enabled: isAuthenticated, // Only run if authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUserStats = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: async (): Promise<UserStats | null> => {
      if (!isAuthenticated) return null;
      console.log('Fetching user stats...');
      const response = await fetch('/api/user/stats', {
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        console.error('Failed to fetch user stats:', response.status, response.statusText);
        throw new Error('Failed to fetch user stats');
      }
      const data = await response.json();
      console.log('User stats response:', data);
      return data.stats;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useUserRacks = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', 'racks'],
    queryFn: async (): Promise<UserRack[]> => {
      if (!isAuthenticated) return [];
      console.log('Fetching user racks...');
      const response = await fetch('/api/user/racks', {
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        console.error('Failed to fetch user racks:', response.status, response.statusText);
        throw new Error('Failed to fetch user racks');
      }
      const data = await response.json();
      console.log('User racks response:', data);
      return data.racks || [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useUserFavorites = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', 'favorites'],
    queryFn: async (): Promise<UserRack[]> => {
      if (!isAuthenticated) return [];
      const response = await fetch('/api/user/favorites', {
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      const data = await response.json();
      return data.favorites || [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rackId, isFavorited }: { rackId: string; isFavorited: boolean }) => {
      const response = await fetch(`/api/racks/${rackId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user favorites
      queryClient.invalidateQueries({ queryKey: ['user', 'favorites'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...AuthService.getAuthHeaders(),
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the profile cache
      queryClient.setQueryData(['user', 'profile'], updatedUser);
      // Update the auth context user data
      AuthService.setUser(updatedUser);
    },
  });
};

export const useDeleteRack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rackId: string) => {
      const response = await fetch(`/api/racks/${rackId}`, {
        method: 'DELETE',
        headers: AuthService.getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to delete rack');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user racks and stats
      queryClient.invalidateQueries({ queryKey: ['user', 'racks'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
    },
  });
};