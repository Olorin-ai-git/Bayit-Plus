/**
 * SearchCardBadges Component
 *
 * Displays badges for search result cards (Premium, Kids, Featured)
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface SearchCardBadgesProps {
  /** Subscription tier requirement */
  requiresSubscription?: string;
  /** Is kids content */
  isKidsContent?: boolean;
  /** Is featured content */
  isFeatured?: boolean;
}

/**
 * Badge overlay for search result cards
 * Memoized for optimal list performance
 */
export const SearchCardBadges = memo(function SearchCardBadges({
  requiresSubscription,
  isKidsContent,
  isFeatured,
}: SearchCardBadgesProps) {
  if (!requiresSubscription && !isKidsContent && !isFeatured) {
    return null;
  }

  return (
    <View style={styles.badges}>
      {requiresSubscription !== 'free' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>👑 Premium</Text>
        </View>
      )}
      {isKidsContent && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>👶 Kids</Text>
        </View>
      )}
      {isFeatured && (
        <View style={[styles.badge, styles.featuredBadge]}>
          <Text style={styles.badgeText}>⭐ Featured</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  badges: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: colors.glassOverlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featuredBadge: {
    backgroundColor: colors.glassOverlayPurple,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
