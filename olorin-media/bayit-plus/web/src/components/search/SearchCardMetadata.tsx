/**
 * SearchCardMetadata Component
 *
 * Displays metadata chips (category, year, rating, duration)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme/colors';

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
 */
export function SearchCardMetadata({
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
}

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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
});
