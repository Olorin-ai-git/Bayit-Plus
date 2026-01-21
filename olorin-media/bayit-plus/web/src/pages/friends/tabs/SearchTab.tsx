import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, UserCheck, Clock } from 'lucide-react';
import { GlassInput, GlassButton } from '@bayit/shared/ui';
import { EmptyState } from '../components/EmptyState';
import { FriendCard } from '../components/FriendCard';
import type { SearchResult } from '../types';

interface SearchTabProps {
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onSendRequest: (userId: string) => void;
  isRTL: boolean;
}

export function SearchTab({
  searchQuery,
  searchResults,
  searchLoading,
  onSearchQueryChange,
  onSearch,
  onSendRequest,
  isRTL,
}: SearchTabProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-4">
      <View className="flex-row gap-2 mb-4">
        <GlassInput
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder={t('friends.searchPlaceholder', 'Search by name...')}
          onSubmitEditing={onSearch}
          className="flex-1"
        />
        <GlassButton
          label={t('common.search', 'Search')}
          onPress={onSearch}
          icon={Search}
          loading={searchLoading}
          className="min-w-[100px]"
        />
      </View>

      {searchResults.length > 0 ? (
        searchResults.map((result) => (
          <FriendCard
            key={result.user_id}
            userId={result.user_id}
            name={result.name}
            avatar={result.avatar}
            friendCount={result.friend_count}
            gamesPlayed={result.games_played}
            relationship={result.relationship}
            onAction={
              result.relationship === 'none'
                ? () => onSendRequest(result.user_id)
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
                ? '#6B21A8'
                : result.relationship === 'request_sent'
                ? '#F59E0B'
                : '#22C55E'
            }
            isRTL={isRTL}
          />
        ))
      ) : searchQuery && !searchLoading ? (
        <EmptyState
          icon={<Search size={48} color="rgba(255,255,255,0.6)" />}
          title={t('friends.noResults', 'No players found')}
          subtitle={t('friends.noResultsDesc', 'Try searching with a different name')}
        />
      ) : null}
    </View>
  );
}
