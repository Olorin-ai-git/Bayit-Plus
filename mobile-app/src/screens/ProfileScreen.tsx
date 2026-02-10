import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { ActivityHistoryTab } from './Profile/components/ActivityHistoryTab';
import { FavoritesTab } from './Profile/components/FavoritesTab';
import { WatchlistTab } from './Profile/components/WatchlistTab';
import { StatsTab } from './Profile/components/StatsTab';
import { ProfileHeader } from './Profile/components/ProfileHeader';

type TabType = 'activity' | 'favorites' | 'watchlist' | 'stats';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { fetchWatchHistory, fetchFavorites, fetchWatchlist, fetchStats, loading } = useProfileStore();
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  useEffect(() => {
    if (!user) {
      Alert.alert(
        t('auth.required', 'Authentication Required'),
        t('auth.loginRequired', 'Please log in to view your profile')
      );
      return;
    }

    loadTabData(activeTab);
  }, [user, activeTab]);

  const loadTabData = useCallback((tab: TabType) => {
    if (!user) return;

    switch (tab) {
      case 'activity':
        fetchWatchHistory();
        break;
      case 'favorites':
        fetchFavorites();
        break;
      case 'watchlist':
        fetchWatchlist();
        break;
      case 'stats':
        fetchStats();
        break;
    }
  }, [user, fetchWatchHistory, fetchFavorites, fetchWatchlist, fetchStats]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {t('auth.loginRequired', 'Please log in to view your profile')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProfileHeader user={user} />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
            {t('profile.activity', 'Activity')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
            {t('profile.favorites', 'Favorites')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'watchlist' && styles.activeTab]}
          onPress={() => setActiveTab('watchlist')}
        >
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>
            {t('profile.watchlist', 'Watchlist')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            {t('profile.stats', 'Stats')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      ) : (
        <ScrollView style={styles.contentContainer}>
          {activeTab === 'activity' && <ActivityHistoryTab />}
          {activeTab === 'favorites' && <FavoritesTab />}
          {activeTab === 'watchlist' && <WatchlistTab />}
          {activeTab === 'stats' && <StatsTab />}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#A855F7',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
});
