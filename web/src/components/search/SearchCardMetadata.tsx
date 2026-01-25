/**
 * SearchCardMetadata Component
 *
 * Displays metadata chips (category, year, rating, duration)
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface SearchCardMetadataProps {
  /** Content category name */
  categoryName?: string;
  /** Release year */
  year?: number;
  /** Rating (0-10) */
  rating?: number;
  /** Duration string */
  duration?: string;
}

/**
 * Metadata chips for search result cards
 * Memoized for optimal list performance
 */
export const SearchCardMetadata = memo(function SearchCardMetadata({
  categoryName,
  year,
  rating,
  duration,
}: SearchCardMetadataProps) {
  if (!categoryName && !year && !rating && !duration) {
    return null;
  }

  return (
    <View style={styles.metadata}>
      {categoryName && (
        <View style={styles.metadataChip}>
          <Text style={styles.metadataText}>{categoryName}</Text>
        </View>
      )}
      {year && (
        <View style={styles.metadataChip}>
          <Text style={styles.metadataText}>{year}</Text>
        </View>
      )}
      {rating && (
        <View style={styles.metadataChip}>
          <Text style={styles.metadataText}>⭐ {rating}</Text>
        </View>
      )}
      {duration && (
        <View style={styles.metadataChip}>
          <Text style={styles.metadataText}>{duration}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.inputBackground,
  },
  metadataText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
});
