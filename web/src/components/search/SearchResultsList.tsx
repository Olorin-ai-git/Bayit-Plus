/**
 * SearchResultsList Component
 *
 * Compact list layout for search results
 * Horizontal layout with thumbnail, title, and metadata in rows
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet } from 'react-native';
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
 */
export function SearchResultsList({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsListProps) {
  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => onResultClick?.(item, index)}
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
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
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
  listItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    fontSize: 32,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  badges: {
    gap: 4,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    color: 'rgba(255,255,255,0.6)',
  },
});
