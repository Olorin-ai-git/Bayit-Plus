/**
 * SearchResultsGrid Component
 *
 * Grid layout for search results - 4 columns web, 6 columns TV, 2 columns mobile
 * Responsive grid with thumbnail, title, and metadata
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet, Platform } from 'react-native';
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
 */
export function SearchResultsGrid({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsGridProps) {
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  const getNumColumns = () => {
    if (Platform.OS === 'web') {
      return window.innerWidth > 1280 ? 6 : 4;
    }
    return 2;
  };

  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => {
    const isFocused = focusedIndex === index;

    return (
      <TouchableOpacity
        style={[styles.gridItem, isFocused && Platform.isTV && styles.gridItemFocused]}
        onPress={() => onResultClick?.(item, index)}
        onFocus={() => setFocusedIndex(index)}
        onBlur={() => setFocusedIndex(null)}
        focusable={Platform.isTV}
        hasTVPreferredFocus={index === 0 && Platform.isTV}
        accessibilityLabel={`${item.title} - ${item.category_name || 'Content'}`}
        accessibilityRole="button"
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
    </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={getNumColumns()}
      contentContainerStyle={styles.container}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.loader}>
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        ) : null
      }
    />
  );
}

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
    borderColor: 'rgba(168,85,247,1)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    gap: 8,
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    color: 'rgba(255,255,255,0.6)',
  },
});
