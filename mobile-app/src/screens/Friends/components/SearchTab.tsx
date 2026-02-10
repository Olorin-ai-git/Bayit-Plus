import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState';
import { FriendCard } from './FriendCard';
import type { SearchResult } from '../../../stores/friendsStore';

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

  const getActionConfig = (relationship?: string) => {
    switch (relationship) {
      case 'none':
        return {
          label: t('friends.add', 'Add Friend'),
          color: '#A855F7',
          onPress: true,
        };
      case 'request_sent':
        return {
          label: t('friends.requestSent', 'Request Sent'),
          color: '#F59E0B',
          onPress: false,
        };
      case 'friend':
        return {
          label: t('friends.alreadyFriends', 'Friends'),
          color: '#22C55E',
          onPress: false,
        };
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder={t('friends.searchPlaceholder', 'Search by name...')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          onSubmitEditing={onSearch}
          style={styles.input}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchButton, searchLoading && styles.searchButtonDisabled]}
          onPress={onSearch}
          disabled={searchLoading}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>{t('common.search', 'Search')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 ? (
        searchResults.map((result) => {
          const actionConfig = getActionConfig(result.relationship);
          return (
            <FriendCard
              key={result.user_id}
              userId={result.user_id}
              name={result.name}
              avatar={result.avatar}
              friendCount={result.friend_count}
              gamesPlayed={result.games_played}
              relationship={result.relationship}
              onAction={
                actionConfig?.onPress ? () => onSendRequest(result.user_id) : undefined
              }
              actionLabel={actionConfig?.label}
              actionColor={actionConfig?.color}
              isRTL={isRTL}
            />
          );
        })
      ) : searchQuery && !searchLoading ? (
        <EmptyState
          title={t('friends.noResults', 'No players found')}
          subtitle={t('friends.noResultsDesc', 'Try searching with a different name')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
