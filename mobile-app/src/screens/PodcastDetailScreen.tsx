import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Image } from 'react-native'
import { GlassCard, GlassButton, LoadingIndicator, ErrorView } from '../components/glass'
import { theme } from '../theme'
import { useRoute, useNavigation } from '@react-navigation/native'
import api from '@bayit/shared-services/api'
import { log } from '@bayit/shared-services/logger.native'

interface PodcastEpisode {
  id: string
  podcastId: string
  title: string
  description: string
  duration: number
  publishedAt: string
  audioUrl: string
}

interface PodcastDetail {
  id: string
  title: string
  description: string
  cover: string
  author: string
  category: string
  episodeCount: number
  website?: string
  language: string
  rssUrl: string
}

export default function PodcastDetailScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { podcastId } = route.params as { podcastId: string }

  const [podcast, setPodcast] = useState<PodcastDetail | null>(null)
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    fetchPodcastDetail()
    fetchEpisodes()
  }, [podcastId])

  const fetchPodcastDetail = async () => {
    try {
      setError(null)
      const response = await api.get(`/podcasts/${podcastId}`)
      setPodcast(response)
      log.info('Podcast detail fetched', { podcastId })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to fetch podcast'
      log.error('Failed to fetch podcast detail', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchEpisodes = async () => {
    try {
      const response = await api.get(`/podcasts/${podcastId}/episodes`)
      setEpisodes(response.items || [])
      log.info('Podcast episodes fetched', { count: response.items?.length || 0 })
    } catch (err: unknown) {
      log.error('Failed to fetch episodes', { error: err })
    }
  }

  const handleSubscribe = async () => {
    try {
      await api.post(`/podcasts/${podcastId}/subscribe`)
      setSubscribed(!subscribed)
      log.info('Podcast subscription toggled', { podcastId, subscribed: !subscribed })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to subscribe'
      log.error('Failed to toggle subscription', { error: errorMessage })
    }
  }

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    navigation.navigate('PodcastPlayer' as never, {
      podcastId,
      episodeId: episode.id,
      episode
    } as never)
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderEpisode = ({ item }: { item: PodcastEpisode }) => (
    <Pressable onPress={() => handlePlayEpisode(item)}>
      <GlassCard style={styles.episodeCard}>
        <View style={styles.episodeContent}>
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.episodeMeta}>
              <Text style={styles.episodeDate}>{formatDate(item.publishedAt)}</Text>
              <Text style={styles.episodeDuration}>{formatDuration(item.duration)}</Text>
            </View>
          </View>
          <Pressable
            style={styles.playButton}
            onPress={() => handlePlayEpisode(item)}
          >
            <Text style={styles.playIcon}>▶️</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  )

  if (loading) {
    return <LoadingIndicator message="Loading podcast..." />
  }

  if (error || !podcast) {
    return <ErrorView message={error || 'Podcast not found'} onRetry={fetchPodcastDetail} />
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Podcast Header */}
        <View style={styles.header}>
          <View style={styles.coverContainer}>
            {podcast.cover ? (
              <Image source={{ uri: podcast.cover }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverPlaceholderText}>🎙️</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{podcast.title}</Text>
          <Text style={styles.author}>by {podcast.author}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.category}>{podcast.category}</Text>
            <Text style={styles.episodeCount}>{podcast.episodeCount} episodes</Text>
          </View>
          <GlassButton
            title={subscribed ? 'Subscribed' : 'Subscribe'}
            onPress={handleSubscribe}
            variant={subscribed ? 'secondary' : 'primary'}
          />
        </View>

        {/* Description */}
        <GlassCard style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{podcast.description}</Text>
        </GlassCard>

        {/* Episodes */}
        <View style={styles.episodesSection}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          <FlatList
            data={episodes}
            renderItem={renderEpisode}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No episodes available</Text>
            }
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  coverContainer: {
    marginBottom: theme.spacing.md,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  coverPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 64,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  author: {
    ...theme.typography.titleMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  category: {
    ...theme.typography.labelMedium,
    color: theme.colors.primary,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  episodeCount: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  descriptionCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  episodesSection: {
    padding: theme.spacing.md,
  },
  episodeCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  episodeTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  episodeDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  episodeDate: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  episodeDuration: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
})
