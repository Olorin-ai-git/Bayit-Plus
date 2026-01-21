import { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassTabs, GlassModal } from '@bayit/shared/ui';
import { spacing } from '@bayit/shared/theme';
import { StatsHeader } from './components';
import { FriendsTab, RequestsTab, SearchTab } from './tabs';
import { useFriendsData } from './hooks';
import type { TabId } from './types';

export default function FriendsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('friends');

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
  } = useFriendsData();

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
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' }}>
      <StatsHeader
        friendsCount={friends.length}
        pendingCount={incomingRequests.length}
        isRTL={isRTL}
      />

      <View className="mb-4">
        <GlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      <View className="gap-4">
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

      {error && <Text className="text-sm text-[#ef4444] text-center mt-4">{error}</Text>}

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
