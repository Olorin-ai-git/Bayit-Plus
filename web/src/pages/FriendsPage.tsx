import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, UserCheck, UserX, Search, Send, Check, X, Trash2, Clock
} from 'lucide-react';
import { useFriendsStore } from '../stores/friendsStore';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassButton, GlassCard, GlassTabs, GlassModal, GlassInput, GlassAvatar, GlassStatCard } from '@bayit/shared/ui';

type TabId = 'friends' | 'requests' | 'search';

export default function FriendsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendMessage, setFriendMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'error' | 'warning' | 'success' | 'info'>('info');

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

  // Load friends and requests on mount
  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const showModal = (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'info') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // Handle search
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
      showModal(err.message || t('friends.searchFailed', 'Failed to search users'), 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle send friend request
  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendFriendRequest(receiverId, friendMessage || undefined);
      setFriendMessage('');
      setSelectedUser(null);
      showModal(t('friends.requestSent', 'Friend request sent!'), 'success');
      handleSearch(); // Refresh search results
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.requestFailed', 'Failed to send request'), 'error');
    }
  };

  // Handle accept request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      showModal(t('friends.requestAccepted', 'Friend request accepted!'), 'success');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.acceptFailed', 'Failed to accept request'), 'error');
    }
  };

  // Handle reject request
  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest(requestId);
      showModal(t('friends.requestRejected', 'Friend request rejected'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.rejectFailed', 'Failed to reject request'), 'error');
    }
  };

  // Handle cancel request
  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequest(requestId);
      showModal(t('friends.requestCancelled', 'Friend request cancelled'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.cancelFailed', 'Failed to cancel request'), 'error');
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      showModal(t('friends.friendRemoved', 'Friend removed'), 'info');
    } catch (err: any) {
      showModal(err.response?.data?.detail || t('friends.removeFailed', 'Failed to remove friend'), 'error');
    }
  };

  // Navigate to player profile
  const viewProfile = (userId: string) => {
    navigate(`/player/${userId}`);
  };

  // Tab configuration
  const tabs = [
    { id: 'friends' as TabId, label: t('friends.myFriends', 'My Friends') },
    {
      id: 'requests' as TabId,
      label: `${t('friends.requests', 'Requests')} ${incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''}`
    },
    { id: 'search' as TabId, label: t('friends.findPlayers', 'Find Players') },
  ];

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('common.justNow', 'Just now');
    if (diffHours < 24) return t('common.hoursAgo', '{{hours}}h ago', { hours: diffHours });
    if (diffDays === 1) return t('common.yesterday', 'Yesterday');
    if (diffDays < 7) return t('common.daysAgo', '{{days}}d ago', { days: diffDays });
    return date.toLocaleDateString();
  };

  // User card component
  const UserCard = ({
    userId,
    name,
    avatar,
    friendCount,
    gamesPlayed,
    relationship,
    onAction,
    actionLabel,
    actionIcon: ActionIcon,
    actionColor = colors.primary,
    secondaryAction,
    secondaryLabel,
    secondaryIcon: SecondaryIcon,
    subtitle,
  }: {
    userId: string;
    name: string;
    avatar: string | null;
    friendCount?: number;
    gamesPlayed?: number;
    relationship?: string;
    onAction?: () => void;
    actionLabel?: string;
    actionIcon?: any;
    actionColor?: string;
    secondaryAction?: () => void;
    secondaryLabel?: string;
    secondaryIcon?: any;
    subtitle?: string;
  }) => (
    <GlassCard style={styles.userCard}>
      <Pressable onPress={() => viewProfile(userId)} style={[styles.userCardContent, isRTL && styles.userCardContentRTL]}>
        {/* Avatar */}
        <GlassAvatar
          uri={avatar}
          name={name}
          size="medium"
        />

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, isRTL && styles.textRTL]}>{name}</Text>
          {subtitle && (
            <Text style={[styles.userSubtitle, isRTL && styles.textRTL]}>{subtitle}</Text>
          )}
          {(friendCount !== undefined || gamesPlayed !== undefined) && (
            <View style={[styles.userStats, isRTL && styles.userStatsRTL]}>
              {friendCount !== undefined && (
                <Text style={styles.userStat}>
                  {t('friends.friendsCount', '{{count}} friends', { count: friendCount })}
                </Text>
              )}
              {gamesPlayed !== undefined && (
                <Text style={styles.userStat}>
                  {t('friends.gamesCount', '{{count}} games', { count: gamesPlayed })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, isRTL && styles.cardActionsRTL]}>
          {secondaryAction && SecondaryIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                secondaryAction();
              }}
              style={styles.iconButton}
            >
              <SecondaryIcon size={20} color={colors.textMuted} />
            </Pressable>
          )}
          {onAction && ActionIcon && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onAction();
              }}
              style={[styles.actionButton, { backgroundColor: `${actionColor}20` }]}
            >
              <ActionIcon size={18} color={actionColor} />
              {actionLabel && (
                <Text style={[styles.actionButtonText, { color: actionColor }]}>{actionLabel}</Text>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    </GlassCard>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <GlassView style={styles.headerGlass} intensity="low">
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.headerIcon}>
            <Users size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, isRTL && styles.textRTL]}>
              {t('friends.title', 'Friends & Opponents')}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
              {t('friends.subtitle', 'Connect with players and challenge friends')}
            </Text>
          </View>
        </View>
      </GlassView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <GlassStatCard
          icon={<UserCheck size={24} color={colors.success} />}
          iconColor={colors.success}
          label={t('friends.friendsLabel', 'Friends')}
          value={friends.length}
          compact
          style={styles.statCard}
        />
        <GlassStatCard
          icon={<Clock size={24} color={colors.warning} />}
          iconColor={colors.warning}
          label={t('friends.pendingLabel', 'Pending')}
          value={incomingRequests.length}
          compact
          style={styles.statCard}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <GlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Friends List Tab */}
        {activeTab === 'friends' && (
          <View style={styles.listContainer}>
            {loading && friends.length === 0 ? (
              <Text style={styles.emptyText}>{t('common.loading', 'Loading...')}</Text>
            ) : friends.length === 0 ? (
              <GlassView style={styles.emptyState}>
                <Users size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('friends.noFriends', 'No friends yet')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('friends.noFriendsDesc', 'Search for players and send friend requests')}
                </Text>
                <GlassButton
                  label={t('friends.findPlayers', 'Find Players')}
                  onPress={() => setActiveTab('search')}
                  style={styles.emptyButton}
                />
              </GlassView>
            ) : (
              friends.map((friend) => (
                <UserCard
                  key={friend.user_id}
                  userId={friend.user_id}
                  name={friend.name}
                  avatar={friend.avatar}
                  subtitle={
                    friend.last_game_at
                      ? t('friends.lastGame', 'Last game: {{time}}', { time: formatTimestamp(friend.last_game_at) })
                      : t('friends.friendsSince', 'Friends since {{date}}', {
                          date: new Date(friend.friends_since).toLocaleDateString(),
                        })
                  }
                  onAction={() => handleRemoveFriend(friend.user_id)}
                  actionLabel={t('friends.remove', 'Remove')}
                  actionIcon={Trash2}
                  actionColor={colors.error}
                />
              ))
            )}
          </View>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <View style={styles.listContainer}>
            {/* Incoming Requests */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('friends.incomingRequests', 'Incoming Requests')}
            </Text>
            {incomingRequests.length === 0 ? (
              <GlassView style={styles.emptySection}>
                <Text style={styles.emptyText}>{t('friends.noIncoming', 'No incoming requests')}</Text>
              </GlassView>
            ) : (
              incomingRequests.map((request) => (
                <GlassCard key={request.id} style={styles.requestCard}>
                  <View style={[styles.requestContent, isRTL && styles.requestContentRTL]}>
                    {/* Avatar */}
                    <GlassAvatar
                      uri={request.sender_avatar}
                      name={request.sender_name}
                      size="medium"
                    />

                    {/* Request Info */}
                    <View style={styles.requestInfo}>
                      <Text style={[styles.requestName, isRTL && styles.textRTL]}>
                        {request.sender_name}
                      </Text>
                      {request.message && (
                        <Text style={[styles.requestMessage, isRTL && styles.textRTL]}>
                          "{request.message}"
                        </Text>
                      )}
                      <Text style={[styles.requestTime, isRTL && styles.textRTL]}>
                        {formatTimestamp(request.sent_at)}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={[styles.requestActions, isRTL && styles.requestActionsRTL]}>
                      <Pressable
                        onPress={() => handleAcceptRequest(request.id)}
                        style={({ pressed }) => [
                          styles.glassIconButton,
                          styles.successButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Check size={20} color={colors.success} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectRequest(request.id)}
                        style={({ pressed }) => [
                          styles.glassIconButton,
                          styles.dangerButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <X size={20} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}

            {/* Outgoing Requests */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL, styles.sectionTitleSpaced]}>
              {t('friends.outgoingRequests', 'Outgoing Requests')}
            </Text>
            {outgoingRequests.length === 0 ? (
              <GlassView style={styles.emptySection}>
                <Text style={styles.emptyText}>{t('friends.noOutgoing', 'No outgoing requests')}</Text>
              </GlassView>
            ) : (
              outgoingRequests.map((request) => (
                <UserCard
                  key={request.id}
                  userId={request.receiver_id}
                  name={request.receiver_name}
                  avatar={request.receiver_avatar}
                  subtitle={t('friends.sentAt', 'Sent {{time}}', { time: formatTimestamp(request.sent_at) })}
                  onAction={() => handleCancelRequest(request.id)}
                  actionLabel={t('friends.cancel', 'Cancel')}
                  actionIcon={X}
                  actionColor={colors.textMuted}
                />
              ))
            )}
          </View>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <View style={styles.listContainer}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <GlassInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('friends.searchPlaceholder', 'Search by name...')}
                onSubmitEditing={handleSearch}
                style={styles.searchInput}
              />
              <GlassButton
                label={t('common.search', 'Search')}
                onPress={handleSearch}
                icon={Search}
                loading={searchLoading}
                style={styles.searchButton}
              />
            </View>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <UserCard
                  key={result.user_id}
                  userId={result.user_id}
                  name={result.name}
                  avatar={result.avatar}
                  friendCount={result.friend_count}
                  gamesPlayed={result.games_played}
                  relationship={result.relationship}
                  onAction={
                    result.relationship === 'none'
                      ? () => {
                          setSelectedUser(result);
                          handleSendRequest(result.user_id);
                        }
                      : result.relationship === 'request_sent'
                      ? undefined
                      : undefined
                  }
                  actionLabel={
                    result.relationship === 'none'
                      ? t('friends.add', 'Add Friend')
                      : result.relationship === 'request_sent'
                      ? t('friends.requestSent', 'Request Sent')
                      : result.relationship === 'friend'
                      ? t('friends.alreadyFriends', 'Friends')
                      : undefined
                  }
                  actionIcon={
                    result.relationship === 'none'
                      ? UserPlus
                      : result.relationship === 'request_sent'
                      ? Clock
                      : result.relationship === 'friend'
                      ? UserCheck
                      : undefined
                  }
                  actionColor={
                    result.relationship === 'none'
                      ? colors.primary
                      : result.relationship === 'request_sent'
                      ? colors.warning
                      : colors.success
                  }
                />
              ))
            ) : searchQuery && !searchLoading ? (
              <GlassView style={styles.emptyState}>
                <Search size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('friends.noResults', 'No players found')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('friends.noResultsDesc', 'Try searching with a different name')}
                </Text>
              </GlassView>
            ) : null}
          </View>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Modal */}
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  // Header with glass
  headerGlass: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glassPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
  },
  // Tabs
  tabsContainer: {
    marginBottom: spacing.lg,
  },
  tabContent: {
    gap: spacing.lg,
  },
  // List
  listContainer: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },
  // User Card
  userCard: {
    padding: spacing.md,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userCardContentRTL: {
    flexDirection: 'row-reverse',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userStatsRTL: {
    flexDirection: 'row-reverse',
  },
  userStat: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardActionsRTL: {
    flexDirection: 'row-reverse',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassBorderWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Glass icon buttons for request actions
  glassIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  successButton: {
    backgroundColor: colors.glassPurpleLight,
  },
  dangerButton: {
    backgroundColor: colors.glassPurpleLight,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  // Request Card
  requestCard: {
    padding: spacing.md,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestContentRTL: {
    flexDirection: 'row-reverse',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestActionsRTL: {
    flexDirection: 'row-reverse',
  },
  requestActionButton: {
    marginHorizontal: spacing.xs,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    minWidth: 100,
  },
  // Empty States
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptySection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Error
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // RTL
  textRTL: {
    textAlign: 'right',
  },
});
