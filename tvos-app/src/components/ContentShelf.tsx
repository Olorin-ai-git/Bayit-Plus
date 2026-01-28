/**
 * ContentShelf - Horizontal scrollable content shelf for TV
 *
 * Features:
 * - Horizontal FlatList with 5-6 visible items
 * - Focus navigation (left/right within shelf)
 * - Shelf title (40-48pt bold)
 * - Lazy loading with buffer
 * - Empty state handling
 */

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { ContentCard, ContentCardProps } from './ContentCard';
import { config } from '../config/appConfig';

export interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  backdrop?: string;
  poster_url?: string;
  stream_url?: string;
  type?: string;
  year?: number;
  duration?: string | number;
  rating?: string | number;
  imdb_rating?: number;
  available_subtitle_languages?: string[];
  created_at?: string;
  published_at?: string;
}

export interface ContentShelfProps {
  title: string;
  items: ContentItem[];
  onItemSelect: (item: ContentItem) => void;
  onSeeAll?: () => void;
  focusable?: boolean;
  testID?: string;
}

export const ContentShelf: React.FC<ContentShelfProps> = ({
  title,
  items,
  onItemSelect,
  onSeeAll,
  focusable = true,
  testID,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [seeAllFocused, setSeeAllFocused] = useState(false);

  const handleItemPress = useCallback(
    (item: ContentItem, index: number) => {
      setFocusedIndex(index);
      onItemSelect(item);
    },
    [onItemSelect]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ContentItem; index: number }) => (
      <ContentCard
        id={item.id}
        title={item.title}
        subtitle={item.subtitle}
        thumbnail={item.thumbnail}
        backdrop={item.backdrop}
        poster_url={item.poster_url}
        stream_url={item.stream_url}
        type={item.type}
        year={item.year}
        duration={item.duration}
        rating={item.rating}
        imdb_rating={item.imdb_rating}
        available_subtitle_languages={item.available_subtitle_languages}
        created_at={item.created_at}
        published_at={item.published_at}
        focused={focusable && focusedIndex === index}
        hasTVPreferredFocus={focusable && index === 0 && focusedIndex === 0}
        onPress={() => handleItemPress(item, index)}
      />
    ),
    [focusable, focusedIndex, handleItemPress]
  );

  const keyExtractor = useCallback((item: ContentItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 336, // 320 (card width) + 16 (horizontal margin)
      offset: 336 * index,
      index,
    }),
    []
  );

  // Empty state
  if (items.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.shelfTitle}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No content available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Shelf Title */}
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.shelfTitle} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          <Text style={styles.itemCount}>({items.length})</Text>
        </View>
        {onSeeAll && (
          <Pressable
            onPress={onSeeAll}
            onFocus={() => setSeeAllFocused(true)}
            onBlur={() => setSeeAllFocused(false)}
            style={[
              styles.seeAllButton,
              seeAllFocused && styles.seeAllButtonFocused,
            ]}
            accessible
            accessibilityLabel={`See all ${title}`}
            accessibilityHint="Navigate to full list"
          >
            <Text
              style={[
                styles.seeAllText,
                seeAllFocused && styles.seeAllTextFocused,
              ]}
            >
              See All →
            </Text>
          </Pressable>
        )}
      </View>

      {/* Horizontal Content List */}
      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        initialNumToRender={6}
        windowSize={3}
        contentContainerStyle={styles.listContent}
        snapToInterval={336}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: config.tv.safeZoneMarginPt,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  shelfTitle: {
    fontSize: 44,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 52,
  },
  itemCount: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
  seeAllButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seeAllButtonFocused: {
    backgroundColor: 'rgba(168,85,247,0.3)',
    borderColor: '#A855F7',
    transform: [{ scale: 1.05 }],
  },
  seeAllText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  seeAllTextFocused: {
    color: '#ffffff',
  },
  listContent: {
    paddingLeft: config.tv.safeZoneMarginPt - 8,
    paddingRight: config.tv.safeZoneMarginPt,
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  emptyText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
});
