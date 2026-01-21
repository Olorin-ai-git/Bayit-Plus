/**
 * ContentBadges Component
 * Displays quality tier and subtitle language badges for content items
 * Cross-platform compatible (web and native)
 */

import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
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

  return (
    <View style={style} className="flex-row items-center gap-1 flex-wrap">
      {hasQuality && (
        <View
          style={{ backgroundColor: qualityStyle.bg }}
          className={`rounded border border-white/10 ${compact ? 'px-1 py-0.5' : 'px-2 py-[3px]'}`}
        >
          <Text
            style={{ color: qualityStyle.text }}
            className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-bold tracking-wide`}
          >
            {tier === '4k' ? '4K' : tier.toUpperCase()}
          </Text>
        </View>
      )}

      {hasSubtitles && (
        <View className={`flex-row items-center bg-white/10 rounded ${compact ? 'px-1 py-0.5 gap-0.5' : 'px-2 py-[3px] gap-1'}`}>
          <Text style={{ fontSize: compact ? 8 : 10 }} className="text-textSecondary font-bold opacity-80">CC</Text>
          <Text
            style={{ fontSize: compact ? 9 : 11 }}
            className="text-textSecondary font-medium tracking-[0.3px]"
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

export default ContentBadges;
