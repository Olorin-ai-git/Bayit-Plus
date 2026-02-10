import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfileStore, type WatchlistItem } from '../../../stores/profileStore';
import { formatDistanceToNow } from 'date-fns';

export function WatchlistTab() {
  const { t } = useTranslation();
  const { watchlist, toggleWatchlist } = useProfileStore();

  const handleRemove = (item: WatchlistItem) => {
    Alert.alert(
      t('profile.removeFromWatchlist', 'Remove from Watchlist'),
      t('profile.removeFromWatchlistConfirm', 'Remove this item from your watchlist?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await toggleWatchlist(item.id, item.type);
              Alert.alert(
                t('common.success', 'Success'),
                t('profile.removedFromWatchlist', 'Removed from watchlist')
              );
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), t('profile.removeFailed', 'Failed to remove item'));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WatchlistItem }) => {
    const timeAgo = formatDistanceToNow(new Date(item.addedAt), { addSuffix: true });

    return (
      <View style={styles.itemContainer}>
        {item.thumbnail && <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />}
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemType}>{item.type}</Text>
          {item.duration && (
            <Text style={styles.itemDuration}>
              {Math.floor(item.duration / 60)}m {Math.floor(item.duration % 60)}s
            </Text>
          )}
          <Text style={styles.timeAgo}>{t('profile.added', 'Added')} {timeAgo}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeButton}>
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (watchlist.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>{t('profile.noWatchlist', 'Your watchlist is empty')}</Text>
        <Text style={styles.emptySubtext}>
          {t('profile.noWatchlistHelp', 'Add content to your watchlist to watch later')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {t('profile.watchlist', 'Watchlist')} ({watchlist.length})
        </Text>
      </View>
      <FlatList
        data={watchlist}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 100,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  itemContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  itemDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  removeButton: {
    padding: 12,
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});
