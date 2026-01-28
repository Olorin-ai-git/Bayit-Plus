/**
 * GlassBadgeTV - Badge component for tvOS content cards
 *
 * TV-optimized badges for:
 * - "NEW" indicator (< 7 days old)
 * - High ratings (>= 8.0)
 * - Subtitle count indicator
 *
 * Design: 32pt × 20pt, readable at 10-foot distance
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type BadgeVariant = 'new' | 'rating' | 'subtitles';

export interface GlassBadgeTVProps {
  variant: BadgeVariant;
  value?: string | number;
  style?: any;
}

export const GlassBadgeTV: React.FC<GlassBadgeTVProps> = ({ variant, value, style }) => {
  const getBadgeContent = () => {
    switch (variant) {
      case 'new':
        return {
          text: 'NEW',
          backgroundColor: '#A855F7', // Purple
          color: '#ffffff',
        };
      case 'rating':
        return {
          text: `⭐ ${value}`,
          backgroundColor: 'rgba(255,215,0,0.9)', // Gold
          color: '#000000',
        };
      case 'subtitles':
        return {
          text: `CC ${value}`,
          backgroundColor: 'rgba(168,85,247,0.7)', // Purple transparent
          color: '#ffffff',
        };
      default:
        return null;
    }
  };

  const content = getBadgeContent();
  if (!content) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: content.backgroundColor },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: content.color }]}>
        {content.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
