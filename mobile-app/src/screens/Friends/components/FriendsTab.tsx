import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState';
import { FriendCard } from './FriendCard';
import type { Friend } from '../../../stores/friendsStore';

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
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title={t('friends.noFriends', 'No friends yet')}
          subtitle={t(
            'friends.noFriendsDesc',
            'Search for players and send friend requests'
          )}
          buttonLabel={t('friends.findPlayers', 'Find Players')}
          onButtonPress={() => onChangeTab('search')}
        />
      </View>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return t('friends.timeMinutesAgo', '{{minutes}}m ago', { minutes: diffMins });
    } else if (diffHours < 24) {
      return t('friends.timeHoursAgo', '{{hours}}h ago', { hours: diffHours });
    } else if (diffDays < 7) {
      return t('friends.timeDaysAgo', '{{days}}d ago', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={styles.container}>
      {friends.map((friend) => (
        <FriendCard
          key={friend.user_id}
          userId={friend.user_id}
          name={friend.name}
          avatar={friend.avatar}
          subtitle={
            friend.last_game_at
              ? t('friends.lastGame', 'Last game: {{time}}', {
                  time: formatTimestamp(friend.last_game_at),
                })
              : t('friends.friendsSince', 'Friends since {{date}}', {
                  date: new Date(friend.friends_since).toLocaleDateString(),
                })
          }
          onAction={() => onRemoveFriend(friend.user_id)}
          actionLabel={t('friends.remove', 'Remove')}
          actionColor="#EF4444"
          isRTL={isRTL}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
