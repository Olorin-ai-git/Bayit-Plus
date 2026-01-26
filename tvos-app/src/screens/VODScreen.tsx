/**
 * VODScreen - Video On Demand library (Movies/Series)
 *
 * Features:
 * - Category tabs (Movies, Series, Genres)
 * - 6-column content grid
 * - Focus navigation
 * - Filter options
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { ContentCard } from '../components/ContentCard';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface VODItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'movie' | 'series';
  year?: number;
  rating?: string;
}

const CATEGORIES = ['All', 'Movies', 'Series', 'Action', 'Comedy', 'Drama', 'Documentary'];

export const VODScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: vodItems, isLoading } = useQuery({
    queryKey: ['vod', selectedCategory],
    queryFn: async () => {
      const response = await api.get('/content/vod', {
        params: { category: selectedCategory === 'All' ? undefined : selectedCategory },
      });
      return response.data;
    },
  });

  const handleItemSelect = (item: VODItem) => {
    navigation.navigate('Player', { vodId: item.id });
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

  const renderItem = ({ item, index }: { item: VODItem; index: number }) => (
    <ContentCard
      id={item.id}
      title={item.title}
      subtitle={item.subtitle || `${item.year || ''} ${item.rating || ''}`.trim()}
      thumbnail={item.thumbnail}
      type={item.type}
      focused={focusedIndex === index}
      hasTVPreferredFocus={index === 0}
      onPress={() => handleItemSelect(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="vod" navigation={navigation} />

      <View style={styles.content}>
        <Text style={styles.title}>Movies & Series</Text>

        {/* Category Filters */}
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        />

        {/* VOD Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : vodItems && vodItems.length > 0 ? (
          <FlatList
            data={vodItems}
            renderItem={renderItem}
            keyExtractor={(item: VODItem) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No content available</Text>
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
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 24,
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
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});
