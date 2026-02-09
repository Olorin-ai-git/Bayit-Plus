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
import { View, Text, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { ContentCard, ContentCardProps } from './ContentCard';
import styles from './styles/ContentShelf.styles';

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
  const { t } = useTranslation();
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
          <Text style={styles.emptyText}>{t('tvos.common.noContent', 'No content available')}</Text>
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
              {t('tvos.common.seeAll', 'See All')} <NativeIcon name="chevronRight" size="sm" color="#A855F7" context="tv" />
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

