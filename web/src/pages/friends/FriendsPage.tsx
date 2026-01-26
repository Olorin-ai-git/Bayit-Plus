import { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassTabs, GlassModal } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';
import { StatsHeader } from './components';
import { FriendsTab, RequestsTab, SearchTab } from './tabs';
import { useFriendsData } from './hooks';
import { useAuthStore } from '../../stores/authStore';
import type { TabId } from './types';

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function FriendsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const { isHydrated, isAuthenticated, token } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('friends');

  // Wait for auth to be ready before fetching friends data
  useEffect(() => {
    if (isHydrated && (isAuthenticated || token)) {
      setAuthReady(true);
    }
  }, [isHydrated, isAuthenticated, token]);

  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    modalVisible,
    setModalVisible,
    modalMessage,
    modalType,
    handleSearch,
    handleSendRequest,
    handleAcceptRequest,
    handleRejectRequest,
    handleCancelRequest,
    handleRemoveFriend,
  } = useFriendsData(authReady);

  // Show loading state while auth is initializing
  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spinner} />
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{t('common.notAuthenticated', 'Not authenticated')}</Text>
      </View>
    );
  }

  const tabs = [
    { id: 'friends' as TabId, label: t('friends.myFriends', 'My Friends') },
    {
      id: 'requests' as TabId,
      label: `${t('friends.requests', 'Requests')} ${
        incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''
      }`,
    },
    { id: 'search' as TabId, label: t('friends.findPlayers', 'Find Players') },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <StatsHeader
        friendsCount={friends.length}
        pendingCount={incomingRequests.length}
        isRTL={isRTL}
      />

      <View style={styles.tabsContainer}>
        <GlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'friends' && (
          <FriendsTab
            friends={friends}
            loading={loading}
            onRemoveFriend={(friendId) => handleRemoveFriend(friendId, t)}
            onChangeTab={setActiveTab}
            isRTL={isRTL}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAcceptRequest={(requestId) => handleAcceptRequest(requestId, t)}
            onRejectRequest={(requestId) => handleRejectRequest(requestId, t)}
            onCancelRequest={(requestId) => handleCancelRequest(requestId, t)}
            isRTL={isRTL}
          />
        )}

        {activeTab === 'search' && (
          <SearchTab
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSearchQueryChange={setSearchQuery}
            onSearch={() => handleSearch(t)}
            onSendRequest={(userId) => handleSendRequest(userId, t)}
            isRTL={isRTL}
          />
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <GlassModal
        visible={modalVisible}
        type={modalType}
        title={
          modalType === 'error'
            ? t('common.error', 'Error')
            : modalType === 'success'
            ? t('common.success', 'Success')
            : t('common.info', 'Info')
        }
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        buttons={[{ text: t('common.ok', 'OK'), style: 'default' }]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    padding: IS_TV_BUILD ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  tabsContainer: {
    marginBottom: spacing.md,
  },
  contentContainer: {
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    minHeight: 300,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
