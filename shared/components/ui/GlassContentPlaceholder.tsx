/**
 * GlassContentPlaceholder Component
 *
 * Type-specific placeholder images for missing content posters
 * Displays appropriate icon and styling based on content type
 *
 * @module GlassContentPlaceholder
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  Film,
  Tv,
  Radio,
  Mic,
  Podcast,
  PlayCircle,
  Music,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

export type ContentPlaceholderType =
  | 'movie'
  | 'series'
  | 'episode'
  | 'podcast'
  | 'radio'
  | 'live'
  | 'music'
  | 'generic';

interface ContentPlaceholderProps {
  type: ContentPlaceholderType;
  size?: 'small' | 'medium' | 'large';
  aspectRatio?: '1:1' | '16:9' | '2:3' | '3:4';
  label?: string;
  icon?: ReactNode;
  iconSize?: number;
  style?: ViewStyle;
}

const PLACEHOLDER_ICONS: Record<ContentPlaceholderType, LucideIcon> = {
  movie: Film,
  series: Tv,
  episode: PlayCircle,
  podcast: Podcast,
  radio: Radio,
  live: Sparkles,
  music: Music,
  generic: Film,
};

const PLACEHOLDER_COLORS: Record<ContentPlaceholderType, string> = {
  movie: colors.primary.DEFAULT,
  series: colors.secondary.DEFAULT,
  episode: colors.info.DEFAULT,
  podcast: colors.success.DEFAULT,
  radio: colors.warning.DEFAULT,
  live: colors.error.DEFAULT,
  music: '#EC4899',
  generic: colors.textMuted,
};

const PLACEHOLDER_LABELS: Record<ContentPlaceholderType, string> = {
  movie: 'Movie',
  series: 'Series',
  episode: 'Episode',
  podcast: 'Podcast',
  radio: 'Radio',
  live: 'Live',
  music: 'Music',
  generic: 'Content',
};

const ASPECT_RATIOS: Record<string, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '2:3': 2 / 3,
  '3:4': 3 / 4,
};

const SIZE_MULTIPLIERS = {
  small: 0.6,
  medium: 1,
  large: 1.4,
};

/**
 * Renders a glassmorphic placeholder for missing content images
 */
export function GlassContentPlaceholder({
  type,
  size = 'medium',
  aspectRatio = '16:9',
  label,
  icon,
  iconSize,
  style,
}: ContentPlaceholderProps) {
  const Icon = PLACEHOLDER_ICONS[type];
  const color = PLACEHOLDER_COLORS[type];
  const defaultLabel = label || PLACEHOLDER_LABELS[type];
  const sizeMultiplier = SIZE_MULTIPLIERS[size];
  const finalIconSize = iconSize || 48 * sizeMultiplier;

  return (
    <View
      style={[
        styles.container,
        {
          aspectRatio: ASPECT_RATIOS[aspectRatio],
          backgroundColor: `${color}15`,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${color}25`,
            borderColor: `${color}40`,
          },
        ]}
      >
        {icon || <Icon size={finalIconSize} color={color} />}
      </View>
      {label !== null && (
        <Text
          style={[
            styles.label,
            {
              color: `${color}DD`,
              fontSize: 12 * sizeMultiplier,
            },
          ]}
          numberOfLines={1}
        >
          {defaultLabel}
        </Text>
      )}
    </View>
  );
}

/**
 * Pre-configured movie placeholder
 */
export function MoviePlaceholder({
  size,
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  return (
    <GlassContentPlaceholder
      type="movie"
      size={size}
      aspectRatio="2:3"
      style={style}
    />
  );
}

/**
 * Pre-configured series placeholder
 */
export function SeriesPlaceholder({
  size,
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  return (
    <GlassContentPlaceholder
      type="series"
      size={size}
      aspectRatio="2:3"
      style={style}
    />
  );
}

/**
 * Pre-configured podcast placeholder
 */
export function PodcastPlaceholder({
  size,
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  return (
    <GlassContentPlaceholder
      type="podcast"
      size={size}
      aspectRatio="1:1"
      style={style}
    />
  );
}

/**
 * Pre-configured radio placeholder
 */
export function RadioPlaceholder({
  size,
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  return (
    <GlassContentPlaceholder
      type="radio"
      size={size}
      aspectRatio="1:1"
      style={style}
    />
  );
}

/**
 * Pre-configured live channel placeholder
 */
export function LiveChannelPlaceholder({
  size,
  style,
}: {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}) {
  return (
    <GlassContentPlaceholder
      type="live"
      size={size}
      aspectRatio="16:9"
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  iconContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
