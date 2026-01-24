/**
 * SearchResultCard Component
 *
 * Individual card component for search results
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SearchCardBadges } from './SearchCardBadges';
import { SearchCardMetadata } from './SearchCardMetadata';
import type { SearchResult } from '../../../../shared/hooks/useSearch';

interface SearchResultCardProps {
  /** Search result data */
  result: SearchResult;
  /** Position in list (for analytics) */
  position: number;
  /** Click callback */
  onPress?: (result: SearchResult, position: number) => void;
}

/**
 * Single search result card with backdrop image and metadata
 */
export function SearchResultCard({ result, position, onPress }: SearchResultCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(result, position)}
      accessibilityLabel={`${result.title} - ${result.category_name || 'Content'}`}
      accessibilityRole="button"
    >
      {/* Backdrop Image */}
      <View style={styles.backdropContainer}>
        {result.backdrop || result.thumbnail ? (
          <Image
            source={{ uri: result.backdrop || result.thumbnail }}
            style={styles.backdrop}
          />
        ) : (
          <View style={styles.placeholderBackdrop}>
            <Text style={styles.placeholderIcon}>🎬</Text>
          </View>
        )}
        <View style={styles.backdropOverlay} />

        {/* Badges */}
        <SearchCardBadges
          requiresSubscription={result.requires_subscription}
          isKidsContent={result.is_kids_content}
          isFeatured={result.is_featured}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{result.title}</Text>

        {result.description && (
          <Text style={styles.description} numberOfLines={3}>
            {result.description}
          </Text>
        )}

        <SearchCardMetadata
          categoryName={result.category_name}
          year={result.year}
          rating={result.rating}
          duration={result.duration}
        />

        {/* Genres */}
        {result.genres && result.genres.length > 0 && (
          <View style={styles.genres}>
            {result.genres.slice(0, 3).map((genre, idx) => (
              <Text key={idx} style={styles.genreText}>
                {genre}
              </Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreText: {
    fontSize: 13,
    color: 'rgba(168,85,247,1)',
  },
});
