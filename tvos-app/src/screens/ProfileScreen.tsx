/**
 * ProfileScreen - User profile management
 *
 * Features:
 * - User profile display
 * - Profile editing
 * - Watch history
 * - Preferences management
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { User, Settings, Clock, Star, LogOut } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

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

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [focusedOption, setFocusedOption] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const response = await api.get('/user/profile');
      return response.data;
    },
  });

  const profileOptions: ProfileOption[] = [
    {
      id: 'watch_history',
      title: 'Watch History',
      subtitle: 'View your recently watched content',
      icon: Clock,
      onPress: () => navigation.navigate('WatchHistory'),
    },
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: `${profile?.favorites_count || 0} items`,
      icon: Star,
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      icon: Settings,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'logout',
      title: 'Sign Out',
      subtitle: 'Log out of your account',
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
          <Text style={styles.loadingText}>Loading profile...</Text>
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
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
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
            <Text style={styles.statLabel}>Hours Watched</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.favorites_count || 0}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Profile Options */}
        <Text style={styles.sectionTitle}>Profile Options</Text>
        <View style={styles.optionsGrid}>
          {profileOptions.map((option, index) => renderOption(option, index))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#A855F7',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#A855F7',
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  profileName: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A855F7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  subscriptionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
  },
  statLabel: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
  },
  optionsGrid: {
    gap: 16,
  },
  optionButton: {
    width: '100%',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 12,
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  optionSubtitle: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
});
