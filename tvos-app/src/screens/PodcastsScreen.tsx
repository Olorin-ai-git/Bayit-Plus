/**
 * PodcastsScreen - Podcast library
 *
 * Features:
 * - Podcast series grid
 * - Category filters (All, News, Comedy, Education, etc.)
 * - Episode listings
 * - 6-column grid layout
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable,Image} from 'react-native';
import { useTranslation} from 'react-i18next';
import { useQuery} from '@tanstack/react-query';
import { Mic2, Play} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/PodcastsScreen.styles';

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

export const PodcastsScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedPodcast, setFocusedPodcast] = useState<string | null>(null);

  const { data: podcasts, isLoading} = useQuery({
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
    navigation.navigate('PodcastDetail', { podcastId: podcast.id});
 };

  const renderCategory = ({ item}: { item: string}) => {
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

  const renderPodcast = ({ item, index}: { item: Podcast; index: number}) => {
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
              <Image source={{ uri: item.artwork}} style={styles.artwork} />
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
                {item.episode_count} {t('tvos.podcasts.episodes', 'episodes')}
              </Text>
            )}
            {item.latest_episode && (
              <Text style={styles.latestEpisode} numberOfLines={1}>
                {t('tvos.podcasts.latestEpisode', 'Latest:')} {item.latest_episode}
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
          <Text style={styles.title}>{t('tvos.podcasts.title', 'Podcasts')}</Text>
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
            <Text style={styles.loadingText}>{t('tvos.podcasts.loading', 'Loading podcasts...')}</Text>
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
            <Text style={styles.emptyText}>{t('tvos.podcasts.empty', 'No podcasts available')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

