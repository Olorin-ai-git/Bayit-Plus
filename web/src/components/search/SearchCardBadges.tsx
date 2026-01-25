/**
 * SearchCardBadges Component
 *
 * Displays badges for search result cards (Premium, Kids, Featured, Auth Required)
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';

interface SearchCardBadgesProps {
  /** Subscription tier requirement */
  requiresSubscription?: string;
  /** Is kids content */
  isKidsContent?: boolean;
  /** Is featured content */
  isFeatured?: boolean;
  /** Requires authentication to view */
  requiresAuth?: boolean;
}

/**
 * Badge overlay for search result cards
 * Memoized for optimal list performance
 */
export const SearchCardBadges = memo(function SearchCardBadges({
  requiresSubscription,
  isKidsContent,
  isFeatured,
  requiresAuth,
}: SearchCardBadgesProps) {
  if (!requiresSubscription && !isKidsContent && !isFeatured && !requiresAuth) {
    return null;
  }

  return (
    <View style={styles.badges}>
      {requiresAuth && (
        <View style={styles.badge}>
          <Lock size={12} color={colors.text} strokeWidth={2} />
          <Text style={styles.badgeText}>Login</Text>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
