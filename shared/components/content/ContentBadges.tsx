/**
 * ContentBadges Component
 * Displays quality tier and subtitle language badges for content items
 * Cross-platform compatible (web and native)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

type QualityTier = '4k' | '1080p' | '720p' | '480p' | 'unknown';

interface ContentBadgesProps {
  qualityTier?: string;
  subtitleLanguages?: string[];
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  showQuality?: boolean;
  showSubtitles?: boolean;
}

const qualityColors: Record<QualityTier, { bg: string; text: string }> = {
  '4k': { bg: 'rgba(255, 215, 0, 0.25)', text: '#FFD700' },
  '1080p': { bg: 'rgba(107, 33, 168, 0.3)', text: colors.primary },
  '720p': { bg: 'rgba(59, 130, 246, 0.25)', text: '#3B82F6' },
  '480p': { bg: 'rgba(156, 163, 175, 0.25)', text: '#9CA3AF' },
  'unknown': { bg: 'rgba(156, 163, 175, 0.2)', text: '#9CA3AF' },
};

export const ContentBadges: React.FC<ContentBadgesProps> = ({
  qualityTier,
  subtitleLanguages = [],
  compact = false,
  style,
  showQuality = true,
  showSubtitles = true,
}) => {
  const hasQuality = showQuality && qualityTier;
  const hasSubtitles = showSubtitles && subtitleLanguages.length > 0;

  if (!hasQuality && !hasSubtitles) {
    return null;
  }

  const tier = (qualityTier?.toLowerCase() as QualityTier) || 'unknown';
  const qualityStyle = qualityColors[tier] || qualityColors.unknown;

  const badgeSize = compact ? 'compact' : 'default';
  const fontSize = compact ? 9 : 11;

  return (
    <View style={[styles.container, style]}>
      {hasQuality && (
        <View
          style={[
            styles.qualityBadge,
            styles[`qualityBadge_${badgeSize}`],
            { backgroundColor: qualityStyle.bg },
          ]}
        >
          <Text
            style={[
              styles.qualityText,
              styles[`qualityText_${badgeSize}`],
              { color: qualityStyle.text },
            ]}
          >
            {tier === '4k' ? '4K' : tier.toUpperCase()}
          </Text>
        </View>
      )}

      {hasSubtitles && (
        <View
          style={[
            styles.subtitleBadge,
            styles[`subtitleBadge_${badgeSize}`],
          ]}
        >
          <Text style={[styles.subtitleIcon, { fontSize: compact ? 8 : 10 }]}>CC</Text>
          <Text
            style={[
              styles.subtitleText,
              { fontSize },
            ]}
          >
            {subtitleLanguages
              .slice(0, compact ? 2 : 3)
              .map(lang => lang.toUpperCase())
              .join(' ')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  qualityBadge: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityBadge_default: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  qualityBadge_compact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qualityText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qualityText_default: {
    fontSize: 11,
  },
  qualityText_compact: {
    fontSize: 9,
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  subtitleBadge_default: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  subtitleBadge_compact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  subtitleIcon: {
    color: colors.textSecondary,
    fontWeight: '700',
    opacity: 0.8,
  },
  subtitleText: {
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default ContentBadges;
