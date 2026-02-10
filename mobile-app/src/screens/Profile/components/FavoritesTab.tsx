import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useProfileStore, type FavoriteItem } from '../../../stores/profileStore';

export function FavoritesTab() {
  const { t } = useTranslation();
  const { favorites, toggleFavorite } = useProfileStore();

  const handleRemove = (item: FavoriteItem) => {
    Alert.alert(
      t('profile.removeFromFavorites', 'Remove from Favorites'),
      t('profile.removeFromFavoritesConfirm', 'Remove this item from your favorites?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await toggleFavorite(item.id, item.type);
              Alert.alert(
                t('common.success', 'Success'),
                t('profile.removedFromFavorites', 'Removed from favorites')
              );
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), t('profile.removeFailed', 'Failed to remove item'));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <View style={styles.itemContainer}>
      {item.thumbnail && <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
        <Text style={styles.itemType}>{item.type}</Text>
      </View>
      <TouchableOpacity onPress={() => handleRemove(item)} style={styles.favoriteButton}>
        <Text style={styles.favoriteIcon}>♥</Text>
      </TouchableOpacity>
    </View>
  );

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>♡</Text>
        <Text style={styles.emptyText}>{t('profile.noFavorites', 'No favorites yet')}</Text>
        <Text style={styles.emptySubtext}>
          {t('profile.noFavoritesHelp', 'Add content to favorites to see it here')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {t('profile.favorites', 'Favorites')} ({favorites.length})
        </Text>
      </View>
      <FlatList
        data={favorites}
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
  itemSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  itemType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  favoriteButton: {
    padding: 12,
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 24,
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    color: 'rgba(255,255,255,0.2)',
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
