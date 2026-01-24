/**
 * SearchResultsList Component
 *
 * Compact list layout for search results
 * Horizontal layout with thumbnail, title, and metadata in rows
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassButton } from '@bayit/glass';
import type { SearchResult } from '../../../../shared/hooks/useSearch';
import { colors, borderRadius, spacing } from '../../theme/colors';

interface SearchResultsListProps {
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
 * List view for search results - compact rows
 * Memoized for performance
 */
export const SearchResultsList = memo(function SearchResultsList({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsListProps) {
  const renderItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <GlassButton
      variant="ghost"
      style={styles.listItem}
      onPress={() => onResultClick?.(item, index)}
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
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.metadata}>
          {item.category_name && (
            <Text style={styles.metadataText}>{item.category_name}</Text>
          )}
          {item.year && <Text style={styles.metadataText}>{item.year}</Text>}
          {item.rating && <Text style={styles.metadataText}>⭐ {item.rating}</Text>}
          {item.duration && <Text style={styles.metadataText}>{item.duration}</Text>}
        </View>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        {item.requires_subscription !== 'free' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>👑</Text>
          </View>
        )}
      </View>
    </GlassButton>
  ), [onResultClick]);

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
  listItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    gap: 12,
  },
  thumbnailContainer: {
    width: 120,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
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
    fontSize: 32,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badges: {
    gap: 4,
  },
  badge: {
    backgroundColor: colors.glassOverlay,
    borderRadius: 4,
    padding: 4,
  },
  badgeText: {
    fontSize: 14,
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
  },
});
