import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Trash2 } from 'lucide-react';
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
      <View className="gap-4">
        <Text className="text-sm text-white/60 text-center">{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View className="gap-4">
        <EmptyState
          icon={<Users size={48} color="rgba(255,255,255,0.6)" />}
          title={t('friends.noFriends', 'No friends yet')}
          subtitle={t('friends.noFriendsDesc', 'Search for players and send friend requests')}
          buttonLabel={t('friends.findPlayers', 'Find Players')}
          onButtonPress={() => onChangeTab('search')}
        />
      </View>
    );
  }

  return (
    <View className="gap-4">
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
          actionColor="#EF4444"
          isRTL={isRTL}
        />
      ))}
    </View>
  );
}
