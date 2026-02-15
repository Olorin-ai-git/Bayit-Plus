import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native'
import { GlassCard, GlassButton, LoadingIndicator, ErrorView, EmptyStateView } from '../components/glass'
import { theme } from '../theme'
import { useNavigation } from '@react-navigation/native'
import api from '@bayit/shared-services/api'
import { log } from '@bayit/shared-services/logger.native'

interface Download {
  id: string
  contentId: string
  contentType: 'movie' | 'episode' | 'podcast' | 'audiobook'
  title: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  downloadedAt?: string
  size?: number
}

export default function DownloadsScreen() {
  const navigation = useNavigation()
  const [downloads, setDownloads] = useState<Download[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDownloads = async () => {
    try {
      setError(null)
      const response = await api.get('/user/downloads')
      setDownloads(response.items || [])
      log.info('Downloads fetched', { count: response.items?.length || 0 })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to fetch downloads'
      log.error('Failed to fetch downloads', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDownloads()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDownloads()
  }

  const handleDelete = async (item: Download) => {
    Alert.alert(
      'Delete Download',
      `Delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/user/downloads/${item.id}`)
              setDownloads(downloads.filter(d => d.id !== item.id))
              log.info('Download deleted', { downloadId: item.id })
            } catch (err: unknown) {
              const errorMessage = (err as { message?: string })?.message || 'Failed to delete download'
              log.error('Failed to delete download', { error: errorMessage })
              Alert.alert('Error', errorMessage)
            }
          }
        }
      ]
    )
  }

  const handlePlay = (item: Download) => {
    if (item.status !== 'completed') {
      Alert.alert('Download Incomplete', 'This download is not yet complete')
      return
    }

    // Navigate to player based on content type
    switch (item.contentType) {
      case 'movie':
      case 'episode':
        navigation.navigate('Player' as never, { contentId: item.contentId } as never)
        break
      case 'podcast':
        navigation.navigate('PodcastPlayer' as never, { episodeId: item.contentId } as never)
        break
      case 'audiobook':
        navigation.navigate('AudiobookPlayer' as never, { audiobookId: item.contentId } as never)
        break
    }
  }

  const formatSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(2)} GB`
  }

  const getStatusColor = (status: Download['status']): string => {
    switch (status) {
      case 'completed': return theme.colors.success
      case 'downloading': return theme.colors.primary
      case 'failed': return theme.colors.error
      default: return theme.colors.textSecondary
    }
  }

  const getStatusText = (status: Download['status']): string => {
    switch (status) {
      case 'completed': return 'Complete'
      case 'downloading': return 'Downloading'
      case 'failed': return 'Failed'
      case 'pending': return 'Pending'
    }
  }

  const renderItem = ({ item }: { item: Download }) => (
    <GlassCard style={styles.downloadCard}>
      <Pressable onPress={() => handlePlay(item)}>
        <View style={styles.downloadContent}>
          <View style={styles.downloadInfo}>
            <Text style={styles.downloadTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.downloadType}>
              {getTypeLabel(item.contentType)}
            </Text>
            {item.size && (
              <Text style={styles.downloadSize}>{formatSize(item.size)}</Text>
            )}
          </View>

          <View style={styles.downloadActions}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}33` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </Pressable>
          </View>
        </View>

        {/* Progress Bar */}
        {item.status === 'downloading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(item.progress)}%</Text>
          </View>
        )}
      </Pressable>
    </GlassCard>
  )

  if (loading) {
    return <LoadingIndicator message="Loading downloads..." />
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchDownloads} />
  }

  const completed = downloads.filter(d => d.status === 'completed')
  const inProgress = downloads.filter(d => d.status === 'downloading')

  if (downloads.length === 0) {
    return (
      <EmptyStateView
        message="No downloads yet. Download content for offline viewing."
        icon="📥"
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{inProgress.length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </GlassCard>
      </View>

      <FlatList
        data={downloads}
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

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    movie: 'Movie',
    episode: 'Episode',
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
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.headlineLarge,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  downloadCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  downloadInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  downloadTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  downloadType: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  downloadSize: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  downloadActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    ...theme.typography.labelSmall,
    fontWeight: '600',
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  deleteIcon: {
    fontSize: 20,
  },
  progressContainer: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
})
