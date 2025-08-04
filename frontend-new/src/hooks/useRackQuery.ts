// React Query hooks for rack data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/api';
import { useRackStore } from '../stores/rackStore';

export const useRackQuery = (rackId?: string) => {
  const setCurrentRack = useRackStore(state => state.setCurrentRack);
  
  return useQuery({
    queryKey: ['rack', rackId],
    queryFn: async () => {
      if (!rackId) throw new Error('Rack ID is required');
      const response = await ApiService.getRack(rackId);
      if (response.success) {
        setCurrentRack(response.rack);
        return response.rack;
      }
      throw new Error('Failed to fetch rack');
    },
    enabled: !!rackId
  });
};

export const useRecentRacksQuery = (limit = 10) => {
  return useQuery({
    queryKey: ['racks', 'recent', limit],
    queryFn: async () => {
      const response = await ApiService.getRecentRacks(limit);
      if (response.success) {
        return response.racks;
      }
      throw new Error('Failed to fetch recent racks');
    }
  });
};

export const useSearchRacksQuery = (query: string) => {
  return useQuery({
    queryKey: ['racks', 'search', query],
    queryFn: async () => {
      const response = await ApiService.searchRacks(query);
      if (response.success) {
        return response.racks;
      }
      throw new Error('Search failed');
    },
    enabled: query.length > 0
  });
};

export const useAnalyzeRackMutation = () => {
  const queryClient = useQueryClient();
  const setCurrentRack = useRackStore(state => state.setCurrentRack);
  const setLoading = useRackStore(state => state.setLoading);
  const setError = useRackStore(state => state.setError);
  
  return useMutation({
    mutationFn: ({ file, description, producerName }: { file: File; description?: string; producerName?: string }) =>
      ApiService.analyzeRack(file, description, producerName),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setLoading(false);
      // Create a rack document from the analysis response
      const rackDoc = {
        _id: data.rack_id,
        filename: data.filename,
        rack_name: data.analysis.rack_name,
        description: data.analysis.user_info?.description,
        producer_name: data.analysis.user_info?.producer_name,
        created_at: new Date().toISOString(),
        analysis: data.analysis,
        stats: data.stats
      };
      setCurrentRack(rackDoc);
      // Invalidate and refetch recent racks
      queryClient.invalidateQueries({ queryKey: ['racks', 'recent'] });
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message);
    }
  });
};