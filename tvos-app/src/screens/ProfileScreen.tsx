/**
 * ProfileScreen - User profile management
 *
 * Features:
 * - User profile display
 * - Profile editing
 * - Watch history
 * - Preferences management
 */

import React, { useState} from 'react';
import { View, Text, Pressable, ScrollView,Image} from 'react-native';
import { useTranslation} from 'react-i18next';
import { useQuery} from '@tanstack/react-query';
import { User, Settings, Clock, Star, LogOut, Bot, Shield, Monitor} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/ProfileScreen.styles';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscription_tier?: string;
  watch_time_hours?: number;
  favorites_count?: number;
}

interface ProfileOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  onPress: () => void;
}

export const ProfileScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [focusedOption, setFocusedOption] = useState<string | null>(null);

  const { data: profile, isLoading} = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const response = await api.get('/user/profile');
      return response.data;
   },
 });

  const profileOptions: ProfileOption[] = [
    {
      id: 'ai_voice',
      title: t('tvos.profile.aiVoiceSettings', 'AI & Voice Settings'),
      subtitle: t('tvos.profile.aiVoiceSettingsSubtitle', 'AI assistant and voice preferences'),
      icon: Bot,
      onPress: () => navigation.navigate('AIVoiceSettings'),
   },
    {
      id: 'security',
      title: t('tvos.profile.securitySettings', 'Security'),
      subtitle: t('tvos.profile.securitySettingsSubtitle', 'Security status and device management'),
      icon: Shield,
      onPress: () => navigation.navigate('SecuritySettings'),
   },
    {
      id: 'devices',
      title: t('tvos.profile.devicesManager', 'Connected Devices'),
      subtitle: t('tvos.profile.devicesManagerSubtitle', 'Manage your connected devices'),
      icon: Monitor,
      onPress: () => navigation.navigate('DevicesManager'),
   },
    {
      id: 'watch_history',
      title: t('tvos.profile.watchHistory', 'Watch History'),
      subtitle: t('tvos.profile.watchHistorySubtitle', 'View your recently watched content'),
      icon: Clock,
      onPress: () => navigation.navigate('WatchHistory'),
   },
    {
      id: 'favorites',
      title: t('tvos.profile.favorites', 'Favorites'),
      subtitle: `${profile?.favorites_count || 0} items`,
      icon: Star,
      onPress: () => navigation.navigate('Favorites'),
   },
    {
      id: 'settings',
      title: t('tvos.profile.settings', 'Settings'),
      subtitle: t('tvos.profile.settingsSubtitle', 'App preferences and configuration'),
      icon: Settings,
      onPress: () => navigation.navigate('Settings'),
   },
    {
      id: 'logout',
      title: t('tvos.profile.signOut', 'Sign Out'),
      subtitle: t('tvos.profile.signOutSubtitle', 'Log out of your account'),
      icon: LogOut,
      onPress: () => {
        // Handle logout
     },
   },
  ];

  const renderOption = (option: ProfileOption, index: number) => {
    const isFocused = focusedOption === option.id;
    const Icon = option.icon;

    return (
      <Pressable
        key={option.id}
        onPress={option.onPress}
        onFocus={() => setFocusedOption(option.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.optionButton}
      >
        <View style={[styles.optionCard, isFocused && styles.optionCardFocused]}>
          <View style={styles.iconContainer}>
            <Icon size={32} color="#A855F7" />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            {option.subtitle && (
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
 };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TVHeader currentScreen="profile" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('tvos.profile.loadingProfile', 'Loading profile...')}</Text>
        </View>
      </View>
    );
 }

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="profile" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={64} color="#A855F7" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
            {profile?.subscription_tier && (
              <View style={styles.subscriptionBadge}>
                <Text style={styles.subscriptionText}>{profile.subscription_tier}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.watch_time_hours || 0}</Text>
            <Text style={styles.statLabel}>{t('tvos.profile.hoursWatched', 'Hours Watched')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.favorites_count || 0}</Text>
            <Text style={styles.statLabel}>{t('tvos.profile.favorites', 'Favorites')}</Text>
          </View>
        </View>

        {/* Profile Options */}
        <Text style={styles.sectionTitle}>{t('tvos.profile.profileOptions', 'Profile Options')}</Text>
        <View style={styles.optionsGrid}>
          {profileOptions.map((option, index) => renderOption(option, index))}
        </View>
      </ScrollView>
    </View>
  );
};

