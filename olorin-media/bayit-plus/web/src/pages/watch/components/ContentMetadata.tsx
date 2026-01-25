/**
 * Content Metadata Component
 * Displays badges with content metadata (year, duration, rating, etc.)
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

interface ContentMetadataProps {
  year?: string;
  duration?: string;
  rating?: string;
  genre?: string;
  episodeCount?: number;
  episodesLabel?: string;
}

export function ContentMetadata({
  year,
  duration,
  rating,
  genre,
  episodeCount,
  episodesLabel = 'episodes',
}: ContentMetadataProps) {
  return (
    <View style={styles.container}>
      {year && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{year}</Text>
        </View>
      )}
      {duration && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{duration}</Text>
        </View>
      )}
      {rating && (
        <View style={[styles.badge, styles.ratingBadge]}>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      )}
      {genre && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{genre}</Text>
        </View>
      )}
      {episodeCount && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {episodeCount} {episodesLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.sm,
    color: 'rgba(156, 163, 175, 1)',
  },
  ratingBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: 'rgba(192, 132, 252, 1)',
  },
});
