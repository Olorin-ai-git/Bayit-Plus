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
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ContentCard, ContentCardProps } from './ContentCard';
import { config } from '../config/appConfig';

export interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
}

export interface ContentShelfProps {
  title: string;
  items: ContentItem[];
  onItemSelect: (item: ContentItem) => void;
  focusable?: boolean;
  testID?: string;
}

export const ContentShelf: React.FC<ContentShelfProps> = ({
  title,
  items,
  onItemSelect,
  focusable = true,
  testID,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

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
        type={item.type}
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
        <Text style={styles.shelfTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={styles.itemCount}>({items.length})</Text>
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
    alignItems: 'baseline',
    paddingHorizontal: config.tv.safeZoneMarginPt,
    marginBottom: 16,
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
