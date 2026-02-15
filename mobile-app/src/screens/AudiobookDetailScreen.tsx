import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Image } from 'react-native'
import { GlassCard, GlassButton, LoadingIndicator, ErrorView } from '../components/glass'
import { theme } from '../theme'
import { useRoute, useNavigation } from '@react-navigation/native'
import api from '@bayit/shared-services/api'
import { log } from '@bayit/shared-services/logger.native'

interface AudiobookChapter {
  id: string
  title: string
  duration: number
  startTime: number
}

interface AudiobookDetail {
  id: string
  title: string
  author: string
  narrator: string
  cover: string
  duration: number
  rating: number
  category: string
  description: string
  publisher: string
  publishedYear: number
  chapters: AudiobookChapter[]
}

export default function AudiobookDetailScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { audiobookId } = route.params as { audiobookId: string }

  const [audiobook, setAudiobook] = useState<AudiobookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAudiobookDetail()
  }, [audiobookId])

  const fetchAudiobookDetail = async () => {
    try {
      setError(null)
      const response = await api.get(`/audiobooks/${audiobookId}`)
      setAudiobook(response)
      log.info('Audiobook detail fetched', { audiobookId })
    } catch (err: unknown) {
      const errorMessage = (err as { message?: string })?.message || 'Failed to fetch audiobook'
      log.error('Failed to fetch audiobook detail', { error: errorMessage })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (chapterIndex?: number) => {
    if (!audiobook) return
    navigation.navigate('AudiobookPlayer' as never, {
      audiobookId,
      audiobook,
      startChapter: chapterIndex || 0
    } as never)
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const renderChapter = ({ item, index }: { item: AudiobookChapter; index: number }) => (
    <Pressable onPress={() => handlePlay(index)}>
      <GlassCard style={styles.chapterCard}>
        <View style={styles.chapterContent}>
          <View style={styles.chapterNumber}>
            <Text style={styles.chapterNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.chapterInfo}>
            <Text style={styles.chapterTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.chapterDuration}>{formatDuration(item.duration)}</Text>
          </View>
          <Pressable
            style={styles.playButton}
            onPress={() => handlePlay(index)}
          >
            <Text style={styles.playIcon}>▶️</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  )

  if (loading) {
    return <LoadingIndicator message="Loading audiobook..." />
  }

  if (error || !audiobook) {
    return <ErrorView message={error || 'Audiobook not found'} onRetry={fetchAudiobookDetail} />
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Audiobook Header */}
        <View style={styles.header}>
          <View style={styles.coverContainer}>
            {audiobook.cover ? (
              <Image source={{ uri: audiobook.cover }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverPlaceholderText}>📖</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{audiobook.title}</Text>
          <Text style={styles.author}>by {audiobook.author}</Text>
          <Text style={styles.narrator}>Narrated by {audiobook.narrator}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ {audiobook.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.duration}>{formatDuration(audiobook.duration)}</Text>
            <Text style={styles.category}>{audiobook.category}</Text>
          </View>

          <GlassButton
            title="Play from Beginning"
            onPress={() => handlePlay(0)}
            variant="primary"
          />
        </View>

        {/* Description */}
        <GlassCard style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>About This Audiobook</Text>
          <Text style={styles.description}>{audiobook.description}</Text>
          <View style={styles.publisherInfo}>
            <Text style={styles.publisherText}>
              Published by {audiobook.publisher} • {audiobook.publishedYear}
            </Text>
          </View>
        </GlassCard>

        {/* Chapters */}
        <View style={styles.chaptersSection}>
          <Text style={styles.sectionTitle}>
            Chapters ({audiobook.chapters.length})
          </Text>
          <FlatList
            data={audiobook.chapters}
            renderItem={renderChapter}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No chapters available</Text>
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
    marginBottom: theme.spacing.xs,
  },
  narrator: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  ratingText: {
    ...theme.typography.labelMedium,
    color: theme.colors.accent,
  },
  duration: {
    ...theme.typography.labelMedium,
    color: theme.colors.primary,
  },
  category: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
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
    marginBottom: theme.spacing.sm,
  },
  publisherInfo: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  publisherText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  chaptersSection: {
    padding: theme.spacing.md,
  },
  chapterCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  chapterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  chapterNumberText: {
    ...theme.typography.titleMedium,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  chapterInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  chapterTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  chapterDuration: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
})
