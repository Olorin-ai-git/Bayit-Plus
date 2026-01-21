import { useRef, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Camera, Zap, Shield, Star, Download } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
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
    <GlassView className="p-8 mb-6" intensity="medium">
      <View className={`items-center gap-8 mb-8 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <View className="items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <Pressable onPress={handleAvatarClick} disabled={avatarUploading}>
            <View className="relative">
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} className="w-[100px] h-[100px] rounded-full border-[3px] border-[#6B21A8]" />
              ) : (
                <View className="w-[100px] h-[100px] rounded-full bg-[#6B21A8]/30 justify-center items-center border-[3px] border-[#6B21A8]">
                  <Text className="text-4xl font-bold text-[#6B21A8]">{initial}</Text>
                </View>
              )}
              {avatarUploading && (
                <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 rounded-full justify-center items-center">
                  <Text className="text-2xl text-white">...</Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-2xl bg-[#6B21A8] justify-center items-center border-2 border-black">
                <Camera size={16} color="#fff" />
              </View>
            </View>
          </Pressable>
        </View>

        <View className={`flex-1 ${isRTL ? 'items-end' : ''}`}>
          <View className={`items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Text className={`text-[28px] font-bold text-white ${isRTL ? 'text-right' : ''}`}>{user?.name || t('profile.guest')}</Text>
            {isAdmin() && (
              <View className="flex-row items-center gap-1 bg-[#F59E0B]/20 px-3 py-1 rounded">
                <Shield size={12} color="#F59E0B" />
                <Text className="text-[11px] font-semibold text-[#F59E0B]">{t('profile.admin', 'Admin')}</Text>
              </View>
            )}
          </View>
          <Text className={`text-[15px] text-white/60 mb-2 ${isRTL ? 'text-right' : ''}`}>{user?.email}</Text>

          {user?.subscription ? (
            <View className={`flex-row items-center gap-2 bg-[#F59E0B]/15 px-4 py-2 rounded-lg mb-2 ${isRTL ? 'self-end' : 'self-start'}`}>
              <Zap size={14} color="#F59E0B" />
              <Text className="text-[13px] font-semibold text-[#F59E0B]">
                {user.subscription.plan === 'premium'
                  ? t('profile.premium', 'Premium')
                  : t('profile.basic', 'Basic')}
              </Text>
            </View>
          ) : (
            <Link to="/subscribe" style={{ textDecoration: 'none' }}>
              <View className="bg-[#6B21A8] px-4 py-2 rounded-lg mb-2">
                <Text className="text-[13px] font-semibold text-white">{t('profile.upgrade', 'Upgrade to Premium')}</Text>
              </View>
            </Link>
          )}

          <Text className={`text-xs text-white/60 ${isRTL ? 'text-right' : ''}`}>
            {t('profile.memberSince', 'Member since')}{' '}
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>

      <View className={`gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
