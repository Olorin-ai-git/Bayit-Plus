/**
 * SearchResultsGrid Component
 *
 * Grid layout for search results - 4 columns web, 6 columns TV, 2 columns mobile
 * Responsive grid with thumbnail, title, and metadata
 */

import React, { memo, useCallback, useState, useMemo } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { GlassButton } from '@bayit/glass';
import type { SearchResult } from '../../../../shared/hooks/useSearch';
import { colors, borderRadius, spacing } from '../../theme/colors';

interface SearchResultsGridProps {
  /** Search results to display */
  results: SearchResult[];
  /** Callback when result clicked */
  onResultClick?: (result: SearchResult, position: number) => void;
  /** Callback for pagination */
  onLoadMore?: () => void;
  /** Loading state for pagination */
  isLoadingMore?: boolean;
}

/**
 * Grid view for search results
 * Memoized for performance
 */
export const SearchResultsGrid = memo(function SearchResultsGrid({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const numColumns = useMemo(() => {
    if (Platform.OS === 'web') {
      return window.innerWidth > 1280 ? 6 : 4;
    }
    return 2;
  }, []);

  const handleItemPress = useCallback((item: SearchResult, index: number) => {
    onResultClick?.(item, index);
  }, [onResultClick]);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(null);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => {
    const isFocused = focusedIndex === index;

    return (
      <GlassButton
        variant="ghost"
        style={[styles.gridItem, isFocused && Platform.isTV && styles.gridItemFocused]}
        onPress={() => handleItemPress(item, index)}
        onFocus={() => handleFocus(index)}
        onBlur={handleBlur}
        focusable={Platform.isTV}
        hasTVPreferredFocus={index === 0 && Platform.isTV}
        accessibilityLabel={`${item.title} - ${item.category_name || 'Content'}`}
      >

      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Text style={styles.placeholderIcon}>🎬</Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badges}>
          {item.requires_subscription !== 'free' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👑</Text>
            </View>
          )}
          {item.is_kids_content && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👶</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Metadata */}
      <View style={styles.metadata}>
        {item.year && <Text style={styles.metadataText}>{item.year}</Text>}
        {item.rating && <Text style={styles.metadataText}>⭐ {item.rating}</Text>}
      </View>
    </GlassButton>
    );
  }, [focusedIndex, handleItemPress, handleFocus, handleBlur]);

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  const ListFooterComponent = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading more results...</Text>
        </View>
      ) : null,
    [isLoadingMore]
  );

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={styles.container}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      ListFooterComponent={ListFooterComponent}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  gridItem: {
    flex: 1,
    margin: 8,
    minWidth: 150,
    maxWidth: 200,
  },
  gridItemFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    transform: [{ scale: 1.05 }],
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  badges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    backgroundColor: colors.glassOverlay,
    borderRadius: 4,
    padding: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    gap: 8,
  },
  metadataText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
  },
});
