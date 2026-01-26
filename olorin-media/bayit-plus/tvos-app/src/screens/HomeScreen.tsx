/**
 * HomeScreen - Main TV home screen with content shelves
 *
 * Features:
 * - Multiple horizontal content shelves
 * - React Query data fetching with 5min cache
 * - Focus navigation between shelves
 * - Loading and error states
 * - Voice integration
 */

import React from 'react';
import { View, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { ContentShelf, ContentItem } from '../components/ContentShelf';
import { TVHeader } from '../components/TVHeader';
import { MultiWindowManager } from '../components/windows/MultiWindowManager';
import { useVoiceTV } from '../hooks/useVoiceTV';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { isListening } = useVoiceTV();

  // Fetch trending content
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: queryKeys.content.trending(),
    queryFn: async () => {
      const response = await api.get('/content/trending');
      return response.data;
    },
  });

  // Fetch live channels
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: queryKeys.live.channels(),
    queryFn: async () => {
      const response = await api.get('/channels');
      return response.data;
    },
  });

  // Fetch VOD content
  const { data: vodData, isLoading: vodLoading } = useQuery({
    queryKey: queryKeys.content.categories(),
    queryFn: async () => {
      const response = await api.get('/content/vod');
      return response.data;
    },
  });

  // Fetch radio stations
  const { data: radioData, isLoading: radioLoading } = useQuery({
    queryKey: ['radio', 'stations'],
    queryFn: async () => {
      const response = await api.get('/radio/stations');
      return response.data;
    },
  });

  // Fetch podcasts
  const { data: podcastsData, isLoading: podcastsLoading } = useQuery({
    queryKey: ['podcasts', 'featured'],
    queryFn: async () => {
      const response = await api.get('/podcasts');
      return response.data;
    },
  });

  // Fetch continue watching (authenticated users only)
  const { data: continueWatchingData } = useQuery({
    queryKey: queryKeys.history.continueWatching(),
    queryFn: async () => {
      if (!user) return [];
      const response = await api.get(`/users/${user.id}/continue-watching`);
      return response.data;
    },
    enabled: !!user,
  });

  const handleItemSelect = (item: ContentItem) => {
    // Navigate based on content type
    switch (item.type) {
      case 'live_channel':
        navigation.navigate('LiveTV', { channelId: item.id });
        break;
      case 'vod':
        navigation.navigate('Player', { vodId: item.id });
        break;
      case 'radio':
        navigation.navigate('Radio', { stationId: item.id });
        break;
      case 'podcast':
        navigation.navigate('Podcasts', { podcastId: item.id });
        break;
      default:
        navigation.navigate('Player', { contentId: item.id });
    }
  };

  // Loading state
  const isLoading = trendingLoading || channelsLoading || vodLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="home" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="home" navigation={navigation} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Continue Watching (authenticated only) */}
        {user && continueWatchingData && continueWatchingData.length > 0 && (
          <ContentShelf
            title="Continue Watching"
            items={continueWatchingData}
            onItemSelect={handleItemSelect}
            testID="continue-watching-shelf"
          />
        )}

        {/* Trending Content */}
        {trendingData && trendingData.length > 0 && (
          <ContentShelf
            title="Trending Now"
            items={trendingData}
            onItemSelect={handleItemSelect}
            testID="trending-shelf"
          />
        )}

        {/* Live TV Channels */}
        {channelsData && channelsData.length > 0 && (
          <ContentShelf
            title="Live TV"
            items={channelsData}
            onItemSelect={handleItemSelect}
            testID="live-tv-shelf"
          />
        )}

        {/* VOD Content */}
        {vodData && vodData.length > 0 && (
          <ContentShelf
            title="Movies & Series"
            items={vodData}
            onItemSelect={handleItemSelect}
            testID="vod-shelf"
          />
        )}

        {/* Radio Stations */}
        {radioData && radioData.length > 0 && (
          <ContentShelf
            title="Radio Stations"
            items={radioData}
            onItemSelect={handleItemSelect}
            testID="radio-shelf"
          />
        )}

        {/* Podcasts */}
        {podcastsData && podcastsData.length > 0 && (
          <ContentShelf
            title="Podcasts"
            items={podcastsData}
            onItemSelect={handleItemSelect}
            testID="podcasts-shelf"
          />
        )}
      </ScrollView>

      {/* Multi-window overlay */}
      <MultiWindowManager currentPage="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
});
