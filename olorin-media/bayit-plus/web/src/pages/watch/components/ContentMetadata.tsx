/**
 * Content Metadata Component
 * Displays badges with content metadata (year, duration, rating, etc.)
 */

import { View, Text, StyleSheet } from 'react-native';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

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
        <GlassView style={styles.badge}>
          <Text style={styles.badgeText}>{year}</Text>
        </GlassView>
      )}
      {duration && (
        <GlassView style={styles.badge}>
          <Text style={styles.badgeText}>{duration}</Text>
        </GlassView>
      )}
      {rating && (
        <GlassView style={[styles.badge, styles.badgePrimary]}>
          <Text style={[styles.badgeText, styles.badgeTextPrimary]}>{rating}</Text>
        </GlassView>
      )}
      {genre && (
        <GlassView style={styles.badge}>
          <Text style={styles.badgeText}>{genre}</Text>
        </GlassView>
      )}
      {episodeCount && (
        <GlassView style={styles.badge}>
          <Text style={styles.badgeText}>
            {episodeCount} {episodesLabel}
          </Text>
        </GlassView>
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgePrimary: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  badgeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
});
