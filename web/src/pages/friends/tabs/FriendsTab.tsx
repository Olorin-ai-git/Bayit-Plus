import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { EmptyState } from '../components/EmptyState';
import { FriendCard } from '../components/FriendCard';
import { formatTimestamp } from '../utils';
import type { Friend } from '../types';

interface FriendsTabProps {
  friends: Friend[];
  loading: boolean;
  onRemoveFriend: (friendId: string) => void;
  onChangeTab: (tab: 'search') => void;
  isRTL: boolean;
}

export function FriendsTab({
  friends,
  loading,
  onRemoveFriend,
  onChangeTab,
  isRTL,
}: FriendsTabProps) {
  const { t } = useTranslation();

  if (loading && friends.length === 0) {
    return (
      <View style={styles.listContainer}>
        <Text style={styles.emptyText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.listContainer}>
        <EmptyState
          icon={<Users size={48} color={colors.textMuted} />}
          title={t('friends.noFriends', 'No friends yet')}
          subtitle={t('friends.noFriendsDesc', 'Search for players and send friend requests')}
          buttonLabel={t('friends.findPlayers', 'Find Players')}
          onButtonPress={() => onChangeTab('search')}
        />
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {friends.map((friend) => (
        <FriendCard
          key={friend.user_id}
          userId={friend.user_id}
          name={friend.name}
          avatar={friend.avatar}
          subtitle={
            friend.last_game_at
              ? t('friends.lastGame', 'Last game: {{time}}', {
                  time: formatTimestamp(friend.last_game_at, t),
                })
              : t('friends.friendsSince', 'Friends since {{date}}', {
                  date: new Date(friend.friends_since).toLocaleDateString(),
                })
          }
          onAction={() => onRemoveFriend(friend.user_id)}
          actionLabel={t('friends.remove', 'Remove')}
          actionIcon={Trash2}
          actionColor={colors.error}
          isRTL={isRTL}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
