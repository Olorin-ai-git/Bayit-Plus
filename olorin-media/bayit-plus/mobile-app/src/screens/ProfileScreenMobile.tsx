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
 * - Text-only design (no emoji icons)
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
import { GlassView, GlassButton } from '@bayit/shared';
import { VerificationModal } from '@bayit/shared/components/VerificationModal';
import { UpgradeButton } from '@bayit/shared/components/UpgradeButton';
import { usePermissions, useDirection } from '@bayit/shared-hooks';
import { useAuthStore } from '@bayit/shared-stores';
import { profilesService } from '@bayit/shared-services';
import { spacing, colors, typography, touchTarget } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('ProfileScreenMobile');

interface ProfileStats {
  watchlistCount: number;
  favoritesCount: number;
  downloadsCount: number;
  watchTimeMinutes: number;
}

export const ProfileScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, logout, isAdminRole, isVerified, needsVerification } = useAuthStore();
  const { can, isAdmin } = usePermissions();
  const { isRTL, direction } = useDirection();
  const { isTablet } = useResponsive();
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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
    if (!user?.id) return;

    try {
      const response = await profilesService.getStats();
      setStats({
        watchlistCount: response.watchlist_count ?? 0,
        favoritesCount: response.favorites_count ?? 0,
        downloadsCount: response.downloads_count ?? 0,
        watchTimeMinutes: response.watch_time_minutes ?? 0,
      });
    } catch (error) {
      // Keep default values on error (already initialized to 0)
      moduleLogger.warn('Failed to load profile stats:', error);
    }
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
      onPress: () => navigation.navigate('Watchlist'),
      badge: stats.watchlistCount,
    },
    {
      id: 'favorites',
      title: t('profile.favorites'),
      onPress: () => navigation.navigate('Favorites'),
      badge: stats.favoritesCount,
    },
    {
      id: 'downloads',
      title: t('profile.downloads'),
      onPress: () => navigation.navigate('Downloads'),
      badge: stats.downloadsCount,
    },
    {
      id: 'subscription',
      title: t('profile.subscription'),
      subtitle: user?.subscription_tier || t('profile.noSubscription'),
      onPress: () => navigation.navigate('Subscription'),
    },
    {
      id: 'billing',
      title: t('profile.billing'),
      onPress: () => navigation.navigate('Billing'),
    },
    {
      id: 'security',
      title: t('profile.security'),
      onPress: () => navigation.navigate('Security'),
    },
    {
      id: 'settings',
      title: t('profile.settings'),
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'language',
      title: t('profile.language'),
      subtitle: i18n.language === 'he' ? 'עברית' : i18n.language === 'en' ? 'English' : 'Español',
      onPress: () => navigation.navigate('LanguageSettings'),
    },
    {
      id: 'notifications',
      title: t('profile.notifications'),
      onPress: () => navigation.navigate('NotificationSettings'),
    },
  ];

  // Add admin option if user has admin permissions
  if (isAdmin) {
    profileMenuItems.push({
      id: 'admin',
      title: t('profile.admin'),
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

        {/* Subscription/Verification Status */}
        {isAdminRole() ? (
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {t('profile.complimentaryPremium')}
            </Text>
          </View>
        ) : user?.subscription_tier ? (
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {user.subscription_tier.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {/* Verification Status - only for non-admins */}
        {!isAdminRole() && user && (
          <View style={styles.verificationContainer}>
            <View style={styles.verificationRow}>
              <View style={[
                styles.verificationBadge,
                (user as any).email_verified ? styles.verifiedBadge : styles.unverifiedBadge
              ]}>
                <Text style={styles.verificationBadgeText}>
                  {(user as any).email_verified ? t('profile.emailVerified') : t('profile.emailUnverified')}
                </Text>
              </View>
              <View style={[
                styles.verificationBadge,
                (user as any).phone_verified ? styles.verifiedBadge : styles.unverifiedBadge
              ]}>
                <Text style={styles.verificationBadgeText}>
                  {(user as any).phone_verified ? t('profile.phoneVerified') : t('profile.phoneUnverified')}
                </Text>
              </View>
            </View>
            {needsVerification() && (
              <GlassButton
                title={t('profile.completeVerification')}
                onPress={() => setShowVerificationModal(true)}
                variant="primary"
                size="sm"
                style={styles.verifyButton}
              />
            )}
          </View>
        )}
      </GlassView>

      {/* Upgrade Section - for verified users without subscription */}
      {!isAdminRole() && isVerified() && !user?.subscription_tier && (
        <GlassView style={styles.upgradeSection}>
          <Text style={styles.upgradeSectionTitle}>{t('profile.unlockPremium')}</Text>
          <Text style={styles.upgradeSectionSubtitle}>
            {t('profile.unlockPremiumDescription')}
          </Text>
          <UpgradeButton fullWidth />
        </GlassView>
      )}

      {/* Stats Grid - 1x2 Text-Only Design (removed bottom 2 cards to prevent overlap) */}
      <View style={styles.statsGrid}>
        <GlassView style={styles.statItem}>
          <Text style={styles.statValue}>{stats.watchlistCount}</Text>
          <Text style={styles.statLabel}>{t('profile.watchlist')}</Text>
        </GlassView>

        <GlassView style={styles.statItem}>
          <Text style={styles.statValue}>{stats.favoritesCount}</Text>
          <Text style={styles.statLabel}>{t('profile.favorites')}</Text>
        </GlassView>
      </View>

      {/* Menu Items - Text-Only Design */}
      <View style={styles.menuSection}>
        {profileMenuItems.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => handlePress(item.onPress)}
            style={({ pressed }) => [
              pressed && styles.menuItemPressed,
            ]}
          >
            <GlassView style={styles.menuItem}>
              <View style={styles.menuContent}>
                <View style={styles.menuLeft}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <View style={styles.menuRight}>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text>
                </View>
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
      <Text style={styles.version}>{t('common.appVersion')}</Text>

      {/* Verification Modal */}
      <VerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {
          setShowVerificationModal(false);
          // Reload profile to show updated verification status
          loadProfileStats();
        }}
      />
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
    paddingBottom: spacing.xxxl * 2, // Extra padding to prevent cutoff
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

  // Verification Status Styles
  verificationContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  verificationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  verificationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#10b981', // Green
  },
  unverifiedBadge: {
    backgroundColor: '#ef4444', // Red
  },
  verificationBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  verifyButton: {
    marginTop: spacing.xs,
    alignSelf: 'center',
  },

  // Upgrade Section Styles
  upgradeSection: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  upgradeSectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  upgradeSectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // Stats Grid Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statItem: {
    flex: 1,
    minWidth: '45%', // Ensures 2 columns on phone
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: 16,
  },
  statValue: {
    ...typography.h1,
    fontSize: 32,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Menu Section Styles
  menuSection: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  menuItem: {
    borderRadius: 12,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.minHeight,
  },
  menuLeft: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  menuSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuRight: {
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

  // Logout Button
  logoutContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    width: '100%',
  },

  // App Version
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
