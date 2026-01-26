/**
 * PodcastsScreen - Podcast library
 *
 * Features:
 * - Podcast series grid
 * - Category filters (All, News, Comedy, Education, etc.)
 * - Episode listings
 * - 6-column grid layout
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Mic2, Play } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  category?: string;
  episode_count?: number;
  latest_episode?: string;
  duration?: string;
}

const CATEGORIES = ['All', 'News', 'Comedy', 'Education', 'Technology', 'Sports', 'Culture'];

export const PodcastsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedPodcast, setFocusedPodcast] = useState<string | null>(null);

  const { data: podcasts, isLoading } = useQuery({
    queryKey: queryKeys.podcasts.all(selectedCategory),
    queryFn: async () => {
      const response = await api.get('/podcasts', {
        params: {
          category: selectedCategory === 'All' ? undefined : selectedCategory,
        },
      });
      return response.data;
    },
  });

  const handlePodcastSelect = (podcast: Podcast) => {
    navigation.navigate('PodcastDetail', { podcastId: podcast.id });
  };

  const renderCategory = ({ item }: { item: string }) => {
    const isSelected = selectedCategory === item;
    return (
      <Pressable onPress={() => setSelectedCategory(item)} style={styles.categoryButton}>
        <View style={[styles.category, isSelected && styles.categorySelected]}>
          <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderPodcast = ({ item, index }: { item: Podcast; index: number }) => {
    const isFocused = focusedPodcast === item.id;
    return (
      <Pressable
        onPress={() => handlePodcastSelect(item)}
        onFocus={() => setFocusedPodcast(item.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.podcastButton}
      >
        <View style={[styles.podcastCard, isFocused && styles.podcastCardFocused]}>
          {/* Artwork */}
          <View style={styles.artworkContainer}>
            {item.artwork ? (
              <Image source={{ uri: item.artwork }} style={styles.artwork} />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Mic2 size={48} color="#A855F7" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.podcastInfo}>
            <Text style={styles.podcastTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.episode_count && (
              <Text style={styles.episodeCount}>
                {item.episode_count} episodes
              </Text>
            )}
            {item.latest_episode && (
              <Text style={styles.latestEpisode} numberOfLines={1}>
                Latest: {item.latest_episode}
              </Text>
            )}
          </View>

          {/* Play Button Overlay */}
          {isFocused && (
            <View style={styles.playOverlay}>
              <Play size={32} color="#ffffff" fill="#ffffff" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="podcasts" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Mic2 size={48} color="#A855F7" />
          <Text style={styles.title}>Podcasts</Text>
        </View>

        {/* Category Filters */}
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        />

        {/* Podcasts Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading podcasts...</Text>
          </View>
        ) : podcasts && podcasts.length > 0 ? (
          <FlatList
            data={podcasts}
            renderItem={renderPodcast}
            keyExtractor={(item: Podcast) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Mic2 size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No podcasts available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoriesContent: {
    gap: 12,
    marginBottom: 32,
  },
  categoryButton: {
    marginRight: 12,
  },
  category: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelected: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  categoryText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  podcastButton: {
    width: 180,
  },
  podcastCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  podcastCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  artworkContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podcastInfo: {
    gap: 4,
  },
  podcastTitle: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  episodeCount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
  },
  latestEpisode: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168,85,247,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});
