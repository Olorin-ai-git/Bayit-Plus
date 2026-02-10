import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '../stores/friendsStore';
import { FriendsTab } from './Friends/components/FriendsTab';
import { RequestsTab } from './Friends/components/RequestsTab';
import { SearchTab } from './Friends/components/SearchTab';
import type { SearchResult } from '../stores/friendsStore';

type TabId = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    fetchFriends,
    fetchRequests,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    searchUsers,
  } = useFriendsStore();

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Error'),
        err.message || t('friends.searchFailed', 'Failed to search users')
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendFriendRequest(receiverId);
      Alert.alert(
        t('common.success', 'Success'),
        t('friends.requestSent', 'Friend request sent!')
      );
      handleSearch();
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Error'),
        err.response?.data?.detail || t('friends.requestFailed', 'Failed to send request')
      );
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      Alert.alert(
        t('common.success', 'Success'),
        t('friends.requestAccepted', 'Friend request accepted!')
      );
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Error'),
        err.response?.data?.detail || t('friends.acceptFailed', 'Failed to accept request')
      );
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest(requestId);
      Alert.alert(
        t('common.info', 'Info'),
        t('friends.requestRejected', 'Friend request rejected')
      );
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Error'),
        err.response?.data?.detail || t('friends.rejectFailed', 'Failed to reject request')
      );
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequest(requestId);
      Alert.alert(
        t('common.info', 'Info'),
        t('friends.requestCancelled', 'Friend request cancelled')
      );
    } catch (err: any) {
      Alert.alert(
        t('common.error', 'Error'),
        err.response?.data?.detail || t('friends.cancelFailed', 'Failed to cancel request')
      );
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert(
      t('friends.remove', 'Remove Friend'),
      t('friends.removeConfirm', 'Are you sure you want to remove this friend?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('friends.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendId);
              Alert.alert(
                t('common.info', 'Info'),
                t('friends.friendRemoved', 'Friend removed')
              );
            } catch (err: any) {
              Alert.alert(
                t('common.error', 'Error'),
                err.response?.data?.detail ||
                  t('friends.removeFailed', 'Failed to remove friend')
              );
            }
          },
        },
      ]
    );
  };

  const tabs = [
    {
      id: 'friends' as TabId,
      label: t('friends.myFriends', 'My Friends'),
      count: friends.length,
    },
    {
      id: 'requests' as TabId,
      label: t('friends.requests', 'Requests'),
      count: incomingRequests.length,
    },
    {
      id: 'search' as TabId,
      label: t('friends.findPlayers', 'Find Players'),
      count: 0,
    },
  ];

  if (loading && friends.length === 0 && incomingRequests.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('friends.title', 'Friends')}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {friends.length} {t('friends.friends', 'friends')}
          </Text>
          {incomingRequests.length > 0 && (
            <Text style={styles.statBadge}>{incomingRequests.length} pending</Text>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}
            >
              {tab.label}
              {tab.count > 0 && ` (${tab.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'friends' && (
          <FriendsTab
            friends={friends}
            loading={loading}
            onRemoveFriend={handleRemoveFriend}
            onChangeTab={setActiveTab}
            isRTL={isRTL}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsTab
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onCancelRequest={handleCancelRequest}
            isRTL={isRTL}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            onSendRequest={handleSendRequest}
            isRTL={isRTL}
          />
        )}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  statBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#A855F7',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
});
