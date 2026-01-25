/**
 * GlassPageHeader Component
 *
 * Reusable glassmorphic page header with icon, title, and optional badge count
 * Supports all platforms (Web, iOS, tvOS) with consistent styling
 * Auto-selects emoji icons based on page type if custom icon not provided
 *
 * @module GlassPageHeader
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';

export type PageType =
  | 'home'
  | 'search'
  | 'live'
  | 'epg'
  | 'vod'
  | 'radio'
  | 'podcasts'
  | 'judaism'
  | 'kids'
  | 'widgets'
  | 'settings'
  | 'profile'
  | 'favorites'
  | 'watchlist'
  | 'downloads'
  | 'recordings'
  | 'help'
  | 'friends'
  | 'games'
  | 'ritual';

interface PageHeaderProps {
  title: string;
  pageType?: PageType;
  icon?: ReactNode | string;
  badge?: string | number;
  iconColor?: string;
  iconBackgroundColor?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  isRTL?: boolean;
}

const DEFAULT_PAGE_ICONS: Record<PageType, string> = {
  home: '🏠',
  search: '🔍',
  live: '📺',
  epg: '📋',
  vod: '🎬',
  radio: '📻',
  podcasts: '🎙️',
  judaism: '✡️',
  kids: '👶',
  widgets: '🧩',
  settings: '⚙️',
  profile: '👤',
  favorites: '❤️',
  watchlist: '📌',
  downloads: '⬇️',
  recordings: '⏺️',
  help: '❓',
  friends: '👫',
  games: '♟️',
  ritual: '🕎',
};

const DEFAULT_ICON_COLORS: Record<PageType, string> = {
  home: colors.primary.DEFAULT,
  search: colors.info.DEFAULT,
  live: colors.error.DEFAULT,
  epg: colors.warning.DEFAULT,
  vod: colors.primary.DEFAULT,
  radio: colors.secondary.DEFAULT,
  podcasts: colors.success.DEFAULT,
  judaism: '#1E40AF',
  kids: '#EC4899',
  widgets: colors.primary.DEFAULT,
  settings: colors.textMuted,
  profile: colors.info.DEFAULT,
  favorites: '#EF4444',
  watchlist: colors.warning.DEFAULT,
  downloads: colors.success.DEFAULT,
  recordings: colors.error.DEFAULT,
  help: colors.info.DEFAULT,
  friends: colors.success.DEFAULT,
  games: colors.warning.DEFAULT,
  ritual: '#1E40AF',
};

/**
 * Renders a glassmorphic page header with icon, title, and optional badge
 */
export function GlassPageHeader({
  title,
  pageType,
  icon,
  badge,
  iconColor,
  iconBackgroundColor,
  style,
  titleStyle,
  isRTL = false,
}: PageHeaderProps) {
  // Determine icon to display
  const displayIcon = icon || (pageType ? DEFAULT_PAGE_ICONS[pageType] : null);

  // Determine icon color
  const finalIconColor =
    iconColor || (pageType ? DEFAULT_ICON_COLORS[pageType] : colors.primary.DEFAULT);

  // Determine icon background color
  const finalIconBgColor = iconBackgroundColor || `${finalIconColor}33`;

  // Render icon (emoji or React component)
  const renderIcon = () => {
    if (!displayIcon) return null;

    if (typeof displayIcon === 'string') {
      // Emoji icon
      return (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: finalIconBgColor },
          ]}
        >
          <Text style={styles.emojiIcon}>{displayIcon}</Text>
        </View>
      );
    }

    // Custom React component icon
    return (
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: finalIconBgColor },
        ]}
      >
        {displayIcon}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.header,
        isRTL && styles.headerRTL,
        style,
      ]}
    >
      {renderIcon()}
      <Text
        style={[
          styles.title,
          isRTL && styles.titleRTL,
          titleStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {badge !== undefined && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  titleRTL: {
    textAlign: 'right',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
