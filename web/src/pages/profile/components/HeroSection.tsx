import { useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Camera, Zap, Shield, Star, Download } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useAuthStore } from '@/stores/authStore';
import { profilesService } from '@/services/api';
import { StatCard } from './StatCard';
import type { UserStats } from '../types';

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
      console.error('Failed to upload avatar:', error);
      onAvatarUploadSuccess(t('profile.uploadFailed', 'Failed to upload avatar. Please try again.'), 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <GlassView style={styles.heroSection} intensity="medium">
      <View style={[styles.heroContent, isRTL && styles.heroContentRTL]}>
        <View style={styles.avatarSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <Pressable onPress={handleAvatarClick} disabled={avatarUploading}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              {avatarUploading && (
                <View style={styles.avatarLoadingOverlay}>
                  <Text style={styles.avatarLoadingText}>...</Text>
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Camera size={16} color={colors.text} />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={[styles.userInfo, isRTL && styles.userInfoRTL]}>
          <View style={[styles.nameRow, isRTL && styles.nameRowRTL]}>
            <Text style={[styles.userName, isRTL && styles.textRTL]}>{user?.name || t('profile.guest')}</Text>
            {isAdmin() && (
              <View style={styles.adminBadge}>
                <Shield size={12} color={colors.warning} />
                <Text style={styles.adminBadgeText}>{t('profile.admin', 'Admin')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user?.email}</Text>

          {user?.subscription ? (
            <View style={[styles.subscriptionBadge, isRTL && styles.subscriptionBadgeRTL]}>
              <Zap size={14} color={colors.warning} />
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

          <Text style={[styles.memberSince, isRTL && styles.textRTL]}>
            {t('profile.memberSince', 'Member since')}{' '}
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, isRTL && styles.statsRowRTL]}>
        <StatCard
          icon={Star}
          iconColor={colors.warning}
          label={t('profile.favorites', 'Favorites')}
          value={stats.favorites}
          loading={statsLoading}
        />
        <StatCard
          icon={Download}
          iconColor={colors.success}
          label={t('profile.downloads', 'Downloads')}
          value={stats.downloads}
          loading={statsLoading}
        />
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroContentRTL: {
    flexDirection: 'row-reverse',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingText: {
    fontSize: 24,
    color: colors.text,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
  },
  userInfoRTL: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nameRowRTL: {
    flexDirection: 'row-reverse',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  userEmail: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  subscriptionBadgeRTL: {
    alignSelf: 'flex-end',
  },
  subscriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  memberSince: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statsRowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});
