import { useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Camera, Zap, Shield, Star, Download } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';
import { profilesService } from '@/services/api';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { StatCard } from './StatCard';
import type { UserStats } from '../types';
import logger from '@/utils/logger';

const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface HeroSectionProps {
  isRTL: boolean;
  stats: UserStats;
  statsLoading: boolean;
  onAvatarUploadSuccess: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export function HeroSection({ isRTL, stats, statsLoading, onAvatarUploadSuccess }: HeroSectionProps) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      onAvatarUploadSuccess(
        t('profile.invalidImageType', 'Please select a valid image file (JPEG, PNG, WebP, or GIF)'),
        'warning'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onAvatarUploadSuccess(t('profile.imageTooLarge', 'Image is too large. Maximum size is 5MB.'), 'warning');
      return;
    }

    setAvatarUploading(true);
    try {
      const response = await profilesService.uploadAvatar(file);
      if (response?.url) {
        useAuthStore.setState((state) => ({
          user: state.user ? { ...state.user, avatar: response.url } : null,
        }));
        onAvatarUploadSuccess(t('profile.uploadSuccess', 'Avatar updated successfully!'), 'success');
      }
    } catch (error) {
      logger.error('Failed to upload avatar', 'HeroSection', error);
      onAvatarUploadSuccess(t('profile.uploadFailed', 'Failed to upload avatar. Please try again.'), 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <GlassView style={styles.container} intensity="medium">
      <View style={[styles.heroRow, isRTL && styles.heroRowReverse]}>
        <View style={styles.avatarContainer}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <Pressable onPress={handleAvatarClick} disabled={avatarUploading}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              {avatarUploading && (
                <View style={styles.avatarUploadingOverlay}>
                  <Text style={styles.uploadingText}>...</Text>
                </View>
              )}
              <View style={styles.cameraButton}>
                <Camera size={16} color="#fff" />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={[styles.userInfoContainer, isRTL && styles.userInfoContainerRTL]}>
          <View style={[styles.nameRow, isRTL && styles.nameRowReverse]}>
            <Text style={[styles.userName, isRTL && styles.textRight]}>{user?.name || t('profile.guest')}</Text>
            {isAdmin() && (
              <View style={styles.adminBadge}>
                <Shield size={12} color="#F59E0B" />
                <Text style={styles.adminBadgeText}>{t('profile.admin', 'Admin')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, isRTL && styles.textRight]}>{user?.email}</Text>

          {user?.subscription ? (
            <View style={[styles.subscriptionBadge, isRTL && styles.subscriptionBadgeRTL]}>
              <Zap size={14} color="#F59E0B" />
              <Text style={styles.subscriptionText}>
                {user.subscription.plan === 'premium'
                  ? t('profile.premium', 'Premium')
                  : t('profile.basic', 'Basic')}
              </Text>
            </View>
          ) : (
            <Link to="/subscribe" style={{ textDecoration: 'none' }}>
              <View style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>{t('profile.upgrade', 'Upgrade to Premium')}</Text>
              </View>
            </Link>
          )}

          <Text style={[styles.memberSince, isRTL && styles.textRight]}>
            {t('profile.memberSince', 'Member since')}{' '}
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, isRTL && styles.statsRowReverse]}>
        <StatCard
          icon={Star}
          iconColor="#F59E0B"
          label={t('profile.favorites', 'Favorites')}
          value={stats.favorites}
          loading={statsLoading}
        />
        <StatCard
          icon={Download}
          iconColor="#22C55E"
          label={t('profile.downloads', 'Downloads')}
          value={stats.downloads}
          loading={statsLoading}
        />
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroRowReverse: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: colors.primaryDark,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primaryDark,
  },
  avatarInitial: {
    fontSize: IS_TV_BUILD ? fontSize['4xl'] : 36,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: IS_TV_BUILD ? fontSize['2xl'] : 24,
    color: colors.text,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfoContainer: {
    flex: 1,
  },
  userInfoContainerRTL: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nameRowReverse: {
    flexDirection: 'row-reverse',
  },
  userName: {
    fontSize: IS_TV_BUILD ? fontSize['3xl'] : 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  textRight: {
    textAlign: 'right',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  adminBadgeText: {
    fontSize: IS_TV_BUILD ? fontSize.sm : 11,
    fontWeight: '600',
    color: colors.warning,
  },
  userEmail: {
    fontSize: IS_TV_BUILD ? fontSize.lg : 15,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  subscriptionBadgeRTL: {
    alignSelf: 'flex-end',
  },
  subscriptionText: {
    fontSize: IS_TV_BUILD ? fontSize.base : 13,
    fontWeight: '600',
    color: colors.warning,
  },
  upgradeButton: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: IS_TV_BUILD ? fontSize.base : 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberSince: {
    fontSize: IS_TV_BUILD ? fontSize.xs : 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statsRowReverse: {
    flexDirection: 'row-reverse',
  },
});
