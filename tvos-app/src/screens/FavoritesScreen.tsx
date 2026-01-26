/**
 * FavoritesScreen - User's favorited content
 *
 * Features:
 * - Favorited movies, series, channels, podcasts
 * - Category filters (All, Movies, Series, Live TV, Radio, Podcasts)
 * - 6-column grid layout
 * - Quick access to favorites
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { ContentCard } from '../components/ContentCard';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface FavoriteItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'channel' | 'radio' | 'podcast';
  added_at: string;
}

const CATEGORIES = ['All', 'Movies', 'Series', 'Live TV', 'Radio', 'Podcasts'];

export const FavoritesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: favorites, isLoading } = useQuery({
    queryKey: queryKeys.user.favorites(selectedCategory),
    queryFn: async () => {
      const response = await api.get('/user/favorites', {
        params: {
          category: selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase(),
        },
      });
      return response.data;
    },
  });

  const handleItemSelect = (item: FavoriteItem) => {
    switch (item.type) {
      case 'movie':
      case 'series':
        navigation.navigate('Player', { vodId: item.id });
        break;
      case 'channel':
        navigation.navigate('Player', { channelId: item.id });
        break;
      case 'radio':
        navigation.navigate('Player', { stationId: item.id });
        break;
      case 'podcast':
        navigation.navigate('Player', { podcastId: item.id });
        break;
    }
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

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => (
    <ContentCard
      id={item.id}
      title={item.title}
      subtitle={item.subtitle}
      thumbnail={item.thumbnail}
      type={item.type}
      focused={focusedIndex === index}
      hasTVPreferredFocus={index === 0}
      onPress={() => handleItemSelect(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="favorites" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Star size={48} color="#A855F7" />
          <Text style={styles.title}>Favorites</Text>
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

        {/* Favorites Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading favorites...</Text>
          </View>
        ) : favorites && favorites.length > 0 ? (
          <FlatList
            data={favorites}
            renderItem={renderItem}
            keyExtractor={(item: FavoriteItem) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Star size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Add content to favorites to see it here
            </Text>
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
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  emptySubtext: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
});
