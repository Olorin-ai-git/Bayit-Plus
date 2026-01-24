/**
 * SearchResultCard Component
 *
 * Individual card component for search results
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { GlassButton } from '../../../../shared/components/ui/GlassButton';
import { SearchCardBadges } from './SearchCardBadges';
import { SearchCardMetadata } from './SearchCardMetadata';
import type { SearchResult } from '../../../../shared/hooks/useSearch';
import { colors, borderRadius, spacing } from '../../theme/colors';

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
 * Memoized for optimal list performance
 */
export const SearchResultCard = memo(function SearchResultCard({
  result,
  position,
  onPress,
}: SearchResultCardProps) {
  const handlePress = useCallback(() => {
    onPress?.(result, position);
  }, [result, position, onPress]);

  return (
    <GlassButton
      variant="ghost"
      style={styles.card}
      onPress={handlePress}
      accessibilityLabel={`${result.title} - ${result.category_name || 'Content'}`}
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
    </GlassButton>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
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
    backgroundColor: colors.cardBackground,
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
    backgroundColor: colors.glassOverlayStrong,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreText: {
    fontSize: 13,
    color: colors.primary,
  },
});
