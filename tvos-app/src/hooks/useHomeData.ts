/**
 * useHomeData - Data fetching hook for HomeScreen
 * Encapsulates all React Query calls for the home screen content
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { queryKeys } from '../config/queryClient';

export function useHomeData() {
  const { user } = useAuthStore();

  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: queryKeys.content.featured(),
    queryFn: async () => {
      const response = await api.get('/content/featured');
      return response.data;
    },
  });

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: queryKeys.content.trending(),
    queryFn: async () => {
      const response = await api.get('/content/trending');
      return response.data;
    },
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: queryKeys.live.channels(),
    queryFn: async () => {
      const response = await api.get('/channels');
      return response.data;
    },
  });

  const { data: vodData, isLoading: vodLoading } = useQuery({
    queryKey: queryKeys.content.categories(),
    queryFn: async () => {
      const response = await api.get('/content/vod');
      return response.data;
    },
  });

  const { data: radioData, isLoading: radioLoading } = useQuery({
    queryKey: ['radio', 'stations'],
    queryFn: async () => {
      const response = await api.get('/radio/stations');
      return response.data;
    },
  });

  const { data: podcastsData, isLoading: podcastsLoading } = useQuery({
    queryKey: ['podcasts', 'featured'],
    queryFn: async () => {
      const response = await api.get('/podcasts');
      return response.data;
    },
  });

  const { data: continueWatchingData } = useQuery({
    queryKey: queryKeys.history.continueWatching(),
    queryFn: async () => {
      if (!user) return [];
      const response = await api.get(`/users/${user.id}/continue-watching`);
      return response.data;
    },
    enabled: !!user,
  });

  const isLoading = featuredLoading || trendingLoading || channelsLoading || vodLoading;

  return {
    featuredData,
    featuredLoading,
    trendingData,
    trendingLoading,
    channelsData,
    channelsLoading,
    vodData,
    vodLoading,
    radioData,
    radioLoading,
    podcastsData,
    podcastsLoading,
    continueWatchingData,
    isLoading,
  };
}
