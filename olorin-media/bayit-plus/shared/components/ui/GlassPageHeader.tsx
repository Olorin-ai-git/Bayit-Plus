/**
 * GlassPageHeader Component
 *
 * Reusable glassmorphic page header with unified icon system
 * Uses icon registry from @olorin/shared-icons for consistent styling
 * Supports all platforms (Web, iOS, tvOS) with glassmorphic styling
 *
 * @module GlassPageHeader
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import type { GlassLevel } from '@olorin/shared-icons';

export type PageType =
  | 'home'
  | 'search'
  | 'live'
  | 'epg'
  | 'vod'
  | 'radio'
  | 'podcasts'
  | 'audiobooks'
  | 'judaism'
  | 'children'
  | 'widgets'
  | 'settings'
  | 'profile'
  | 'favorites'
  | 'watchlist'
  | 'downloads'
  | 'recordings'
  | 'support'
  | 'friends'
  | 'games'
  | 'discover'
  | 'plans'
  | 'admin';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  pageType?: PageType;
  icon?: ReactNode | string;
  badge?: string | number;
  iconColor?: string;
  glassLevel?: GlassLevel;
  action?: ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  isRTL?: boolean;
}

/**
 * Mapping from page type to icon registry name
 * Each page type maps to a unified icon from the registry
 */
const PAGE_TYPE_TO_ICON: Record<PageType, string> = {
  home: 'home',
  search: 'search',
  live: 'live',
  epg: 'epg',
  vod: 'vod',
  radio: 'radio',
  podcasts: 'podcasts',
  audiobooks: 'audiobooks',
  judaism: 'judaism',
  children: 'children',
  widgets: 'widgets',
  settings: 'settings',
  profile: 'profile',
  favorites: 'favorites',
  watchlist: 'watchlist',
  downloads: 'downloads',
  recordings: 'recordings',
  support: 'support',
  friends: 'friends',
  games: 'games',
  discover: 'discover',
  plans: 'plans',
  admin: 'admin',
};

/**
 * Glass level configuration per page type
 * Controls the intensity of the glassmorphic background
 */
const PAGE_TYPE_GLASS_LEVEL: Record<PageType, GlassLevel> = {
  home: 'medium',
  search: 'light',
  live: 'medium',
  epg: 'medium',
  vod: 'medium',
  radio: 'medium',
  podcasts: 'medium',
  audiobooks: 'medium',
  judaism: 'medium',
  children: 'medium',
  widgets: 'light',
  settings: 'light',
  profile: 'light',
  favorites: 'light',
  watchlist: 'light',
  downloads: 'light',
  recordings: 'light',
  support: 'light',
  friends: 'light',
  games: 'medium',
  discover: 'medium',
  plans: 'medium',
  admin: 'medium',
};

/**
 * Renders a glassmorphic page header with unified icon system
 */
export function GlassPageHeader({
  title,
  subtitle,
  pageType,
  icon,
  badge,
  iconColor,
  glassLevel,
  action,
  style,
  titleStyle,
  isRTL = false,
}: PageHeaderProps) {
  // Determine icon name from page type or use custom icon
  const iconName = pageType ? PAGE_TYPE_TO_ICON[pageType] : null;

  // Determine glass level with fallback
  const effectiveGlassLevel: GlassLevel =
    glassLevel || (pageType ? PAGE_TYPE_GLASS_LEVEL[pageType] : undefined) || 'medium';

  // Get glass background styling
  const getGlassBackground = () => {
    const glassLevels = {
      light: {
        backgroundColor: 'rgba(10, 10, 10, 0.5)',
        borderColor: 'rgba(126, 34, 206, 0.15)',
      },
      medium: {
        backgroundColor: 'rgba(10, 10, 10, 0.6)',
        borderColor: 'rgba(126, 34, 206, 0.25)',
      },
      strong: {
        backgroundColor: 'rgba(10, 10, 10, 0.85)',
        borderColor: 'rgba(126, 34, 206, 0.7)',
      },
    };
    return glassLevels[effectiveGlassLevel];
  };

  // Render icon using the unified icon system
  const renderIcon = () => {
    const glassStyle = getGlassBackground();

    // If custom icon provided (ReactNode or string), use it
    if (icon && typeof icon !== 'string') {
      return (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderColor: glassStyle.borderColor,
            },
          ]}
        >
          {icon}
        </View>
      );
    }

    // If custom icon is a string, treat it as an icon name
    if (typeof icon === 'string') {
      return (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderColor: glassStyle.borderColor,
            },
          ]}
        >
          <NativeIcon
            name={icon}
            size="lg"
            color={iconColor}
            variant="colored"
          />
        </View>
      );
    }

    // Use page type icon
    if (iconName) {
      return (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderColor: glassStyle.borderColor,
            },
          ]}
        >
          <NativeIcon
            name={iconName}
            size="lg"
            color={iconColor}
            variant="colored"
          />
        </View>
      );
    }

    return null;
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
      <View style={[styles.titleContainer, isRTL && styles.titleContainerRTL]}>
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
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              isRTL && styles.subtitleRTL,
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {badge !== undefined && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {action && (
        <View style={styles.actionContainer}>
          {action}
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
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  titleContainerRTL: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  titleRTL: {
    textAlign: 'right',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  subtitleRTL: {
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
  actionContainer: {
    marginLeft: spacing.sm,
  },
});
