import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { GlassCard, LoadingIndicator, ErrorView, EmptyStateView } from '../components/glass'
import { theme } from '../theme'
import { useNavigation } from '@react-navigation/native'
import api from '@bayit/shared-services/api'
import { log } from '@bayit/shared-services/logger.native'

interface FavoriteItem {
  id: string
  contentId: string
  contentType: 'channel' | 'content' | 'radio' | 'podcast' | 'audiobook'
  title: string
  subtitle?: string
  thumbnail?: string
  addedAt: string
}

export default function FavoritesScreen() {
  const navigation = useNavigation()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchFavorites = async () => {
    try {
      setError(null)
      const response = await api.get('/user/favorites')
      setFavorites(response.items || [])
      log.info('Favorites fetched', { count: response.items?.length || 0 })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to fetch favorites'
      log.error('Failed to fetch favorites', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFavorites()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchFavorites()
  }

  const handleRemoveFavorite = async (item: FavoriteItem) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${item.title}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/user/favorites/${item.id}`)
              setFavorites(favorites.filter(f => f.id !== item.id))
              log.info('Favorite removed', { contentId: item.contentId })
            } catch (err: unknown) {
              const errorMessage = (err as { message?: string })?.message || 'Failed to remove favorite'
              log.error('Failed to remove favorite', { error: errorMessage })
              Alert.alert('Error', errorMessage)
            }
          }
        }
      ]
    )
  }

  const handleItemPress = (item: FavoriteItem) => {
    // Navigate based on content type
    switch (item.contentType) {
      case 'channel':
        navigation.navigate('ChannelDetail' as never, { channelId: item.contentId } as never)
        break
      case 'content':
        navigation.navigate('ContentDetail' as never, { contentId: item.contentId } as never)
        break
      case 'radio':
        navigation.navigate('Radio' as never)
        break
      case 'podcast':
        navigation.navigate('PodcastDetail' as never, { podcastId: item.contentId } as never)
        break
      case 'audiobook':
        navigation.navigate('AudiobookDetail' as never, { audiobookId: item.contentId } as never)
        break
    }
  }

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <Pressable onPress={() => handleItemPress(item)} onLongPress={() => handleRemoveFavorite(item)}>
      <GlassCard style={styles.favoriteCard}>
        <View style={styles.favoriteContent}>
          {item.thumbnail && (
            <View style={styles.thumbnailContainer}>
              <Text style={styles.thumbnailPlaceholder}>
                {getTypeIcon(item.contentType)}
              </Text>
            </View>
          )}
          <View style={styles.favoriteInfo}>
            <Text style={styles.favoriteTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.favoriteSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            <Text style={styles.favoriteType}>
              {getTypeLabel(item.contentType)}
            </Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Text style={styles.removeIcon}>❌</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  )

  if (loading) {
    return <LoadingIndicator message="Loading favorites..." />
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchFavorites} />
  }

  if (favorites.length === 0) {
    return (
      <EmptyStateView
        message="No favorites yet. Add content to your favorites to see it here."
        icon="⭐"
      />
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      />
    </View>
  )
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    channel: '📺',
    content: '🎬',
    radio: '📻',
    podcast: '🎙️',
    audiobook: '📖'
  }
  return icons[type] || '⭐'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    channel: 'Live Channel',
    content: 'Video',
    radio: 'Radio Station',
    podcast: 'Podcast',
    audiobook: 'Audiobook'
  }
  return labels[type] || type
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  favoriteCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  favoriteContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  thumbnailPlaceholder: {
    fontSize: 32,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  favoriteSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  favoriteType: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },
  removeIcon: {
    fontSize: 20,
  },
})
