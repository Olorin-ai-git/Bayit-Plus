/**
 * SearchResultsCards Component
 *
 * Detailed card layout for search results
 * Large cards with backdrop, full metadata, and description
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet } from 'react-native';
import type { SearchResult } from '../../../../shared/hooks/useSearch';

interface SearchResultsCardsProps {
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
 * Cards view for search results - detailed cards
 */
export function SearchResultsCards({
  results,
  onResultClick,
  onLoadMore,
  isLoadingMore,
}: SearchResultsCardsProps) {
  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onResultClick?.(item, index)}
      accessibilityLabel={`${item.title} - ${item.category_name || 'Content'}`}
      accessibilityRole="button"
    >
      {/* Backdrop Image */}
      <View style={styles.backdropContainer}>
        {item.backdrop || item.thumbnail ? (
          <Image
            source={{ uri: item.backdrop || item.thumbnail }}
            style={styles.backdrop}
          />
        ) : (
          <View style={styles.placeholderBackdrop}>
            <Text style={styles.placeholderIcon}>🎬</Text>
          </View>
        )}
        <View style={styles.backdropOverlay} />

        {/* Badges */}
        <View style={styles.badges}>
          {item.requires_subscription !== 'free' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👑 Premium</Text>
            </View>
          )}
          {item.is_kids_content && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👶 Kids</Text>
            </View>
          )}
          {item.is_featured && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Text style={styles.badgeText}>⭐ Featured</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>

        {item.description && (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        <View style={styles.metadata}>
          {item.category_name && (
            <View style={styles.metadataChip}>
              <Text style={styles.metadataText}>{item.category_name}</Text>
            </View>
          )}
          {item.year && (
            <View style={styles.metadataChip}>
              <Text style={styles.metadataText}>{item.year}</Text>
            </View>
          )}
          {item.rating && (
            <View style={styles.metadataChip}>
              <Text style={styles.metadataText}>⭐ {item.rating}</Text>
            </View>
          )}
          {item.duration && (
            <View style={styles.metadataChip}>
              <Text style={styles.metadataText}>{item.duration}</Text>
            </View>
          )}
        </View>

        {/* Genres */}
        {item.genres && item.genres.length > 0 && (
          <View style={styles.genres}>
            {item.genres.slice(0, 3).map((genre, idx) => (
              <Text key={idx} style={styles.genreText}>
                {genre}
              </Text>
            ))}
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
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  backdropContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  placeholderBackdrop: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
  },
  backdropOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))',
  },
  badges: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featuredBadge: {
    backgroundColor: 'rgba(168,85,247,0.7)',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreText: {
    fontSize: 13,
    color: 'rgba(168,85,247,1)',
  },
  loader: {
    padding: 20,
    alignItems: 'center',
  },
  loaderText: {
    color: 'rgba(255,255,255,0.6)',
  },
});
