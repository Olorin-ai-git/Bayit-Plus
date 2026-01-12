/**
 * ProfileScreenMobile
 *
 * Mobile-optimized profile screen
 * Features:
 * - User profile information
 * - Quick stats (watchlist, favorites, downloads)
 * - Settings and preferences
 * - Account management
 * - Responsive layout for phone/tablet
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView, GlassButton, GlassStatCard } from '@bayit/shared';
import { usePermissions, useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { spacing, colors, typography, touchTarget } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface ProfileStats {
  watchlistCount: number;
  favoritesCount: number;
  downloadsCount: number;
  watchTimeMinutes: number;
}

export const ProfileScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { can, isAdmin } = usePermissions();
  const { isRTL, direction } = useDirection();
  const { isTablet } = useResponsive();

  const [stats, setStats] = useState<ProfileStats>({
    watchlistCount: 0,
    favoritesCount: 0,
    downloadsCount: 0,
    watchTimeMinutes: 0,
  });

  useEffect(() => {
    loadProfileStats();
  }, [user?.id]);

  const loadProfileStats = async () => {
    // TODO: Load actual stats from API
    setStats({
      watchlistCount: 12,
      favoritesCount: 24,
      downloadsCount: 5,
      watchTimeMinutes: 1250,
    });
  };

  const handlePress = (action: () => void) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactLight');
    }
    action();
  };

  const handleLogout = async () => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    }
    await logout();
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} ${t('profile.minutes')}`;
    return `${hours} ${t('profile.hours')}`;
  };

  const profileMenuItems = [
    {
      id: 'watchlist',
      title: t('profile.watchlist'),
      icon: '📋',
      onPress: () => navigation.navigate('Watchlist'),
      badge: stats.watchlistCount,
    },
    {
      id: 'favorites',
      title: t('profile.favorites'),
      icon: '⭐',
      onPress: () => navigation.navigate('Favorites'),
      badge: stats.favoritesCount,
    },
    {
      id: 'downloads',
      title: t('profile.downloads'),
      icon: '⬇️',
      onPress: () => navigation.navigate('Downloads'),
      badge: stats.downloadsCount,
    },
    {
      id: 'settings',
      title: t('profile.settings'),
      icon: '⚙️',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'language',
      title: t('profile.language'),
      icon: '🌐',
      subtitle: i18n.language === 'he' ? 'עברית' : i18n.language === 'en' ? 'English' : 'Español',
      onPress: () => navigation.navigate('Settings', { section: 'language' }),
    },
    {
      id: 'notifications',
      title: t('profile.notifications'),
      icon: '🔔',
      onPress: () => navigation.navigate('Settings', { section: 'notifications' }),
    },
  ];

  // Add admin option if user has admin permissions
  if (isAdmin) {
    profileMenuItems.push({
      id: 'admin',
      title: t('profile.admin'),
      icon: '👤',
      onPress: () => navigation.navigate('Admin'),
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <GlassView style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{user?.name || t('profile.guest')}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}

        {user?.subscription && (
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {user.subscription.toUpperCase()}
            </Text>
          </View>
        )}
      </GlassView>

      {/* Stats Cards */}
      {/* Row 1: Watch Time and Favorites */}
      <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
        <GlassStatCard
          label={t('profile.watchTime')}
          value={formatWatchTime(stats.watchTimeMinutes)}
          icon={<Text style={styles.statIcon}>⏱️</Text>}
          style={styles.statCard}
          compact
        />
        <GlassStatCard
          label={t('profile.favorites')}
          value={stats.favoritesCount.toString()}
          icon={<Text style={styles.statIcon}>⭐</Text>}
          style={styles.statCard}
          compact
        />
      </View>

      {/* Row 2: Watchlist and Downloads */}
      <View style={[styles.statsContainer, styles.statsContainerLast, isTablet && styles.statsContainerTablet]}>
        <GlassStatCard
          label={t('profile.watchlist')}
          value={stats.watchlistCount.toString()}
          icon={<Text style={styles.statIcon}>📋</Text>}
          style={styles.statCard}
          compact
        />
        <GlassStatCard
          label={t('profile.downloads')}
          value={stats.downloadsCount.toString()}
          icon={<Text style={styles.statIcon}>⬇️</Text>}
          style={styles.statCard}
          compact
        />
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {profileMenuItems.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => handlePress(item.onPress)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
              index === profileMenuItems.length - 1 && styles.menuItemLast,
            ]}
          >
            <GlassView style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Text style={styles.chevron}>›</Text>
              </View>
            </GlassView>
          </Pressable>
        ))}
      </View>

      {/* Logout Button */}
      {user && (
        <View style={styles.logoutContainer}>
          <GlassButton
            variant="danger"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            {t('profile.logout')}
          </GlassButton>
        </View>
      )}

      {/* App Version */}
      <Text style={styles.version}>Bayit+ v1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  subscriptionText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsContainerLast: {
    marginBottom: spacing.xl,
  },
  statsContainerTablet: {
    // On tablet, stats cards are larger
  },
  statCard: {
    flex: 1,
  },
  statIcon: {
    fontSize: 20,
  },
  menuSection: {
    marginBottom: spacing.xl,
  },
  menuItem: {
    marginBottom: spacing.sm,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemLast: {
    marginBottom: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    minHeight: touchTarget.minHeight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  logoutContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    width: '100%',
  },
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
