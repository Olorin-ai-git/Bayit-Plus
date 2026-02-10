import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfileStore, type WatchHistoryItem } from '../../../stores/profileStore';
import { formatDistanceToNow } from 'date-fns';

export function ActivityHistoryTab() {
  const { t } = useTranslation();
  const { watchHistory, removeFromHistory, clearHistory } = useProfileStore();

  const handleRemove = (item: WatchHistoryItem) => {
    Alert.alert(
      t('profile.removeFromHistory', 'Remove from History'),
      t('profile.removeFromHistoryConfirm', 'Remove this item from your watch history?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromHistory(item.id);
              Alert.alert(t('common.success', 'Success'), t('profile.removed', 'Removed from history'));
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), t('profile.removeFailed', 'Failed to remove item'));
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      t('profile.clearHistory', 'Clear All History'),
      t('profile.clearHistoryConfirm', 'Are you sure you want to clear your entire watch history?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.clear', 'Clear All'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory();
              Alert.alert(t('common.success', 'Success'), t('profile.historyCleared', 'History cleared'));
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), t('profile.clearFailed', 'Failed to clear history'));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WatchHistoryItem }) => {
    const progressPercent = Math.round(item.progress);
    const timeAgo = formatDistanceToNow(new Date(item.lastWatched), { addSuffix: true });

    return (
      <View style={styles.itemContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemType}>{item.type}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeButton}>
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (watchHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('profile.noHistory', 'No watch history yet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {t('profile.watchHistory', 'Watch History')} ({watchHistory.length})
        </Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAllText}>{t('profile.clearAll', 'Clear All')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={watchHistory}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 2,
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
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
