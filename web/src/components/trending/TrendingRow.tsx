import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { trendingService } from '../../services/api'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface Topic {
  title: string
  summary?: string
  category: string
  category_label?: { he: string; en: string }
  sentiment?: 'positive' | 'negative' | 'neutral'
  importance: number
}

interface TrendingData {
  topics: Topic[]
  overall_mood?: string
  top_story?: string
  sources?: string[]
}

interface TrendingRowProps {
  onTopicClick?: (topic: Topic) => void
}

export default function TrendingRow({ onTopicClick }: TrendingRowProps) {
  const [data, setData] = useState<TrendingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrending = async () => {
    try {
      setLoading(true)
      const result = await trendingService.getTopics()
      setData(result)
      setError(null)
    } catch (err) {
      logger.error('Failed to fetch trending', 'TrendingRow', err)
      setError('Unable to load trending topics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrending()
    const interval = setInterval(fetchTrending, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      security: '🔒',
      politics: '🏛️',
      tech: '💻',
      culture: '🎭',
      sports: '⚽',
      economy: '📈',
      entertainment: '🎬',
      weather: '🌤️',
      health: '🏥',
      general: '📰',
    }
    return emojis[category] || '📌'
  }

  const getSentimentColors = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return { borderColor: 'rgba(34, 197, 94, 0.3)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }
      case 'negative':
        return { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }
      default:
        return { borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
    }
  }

  if (loading) {
    return (
      <GlassView style={styles.container}>
        <View style={styles.header}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>מה חם בישראל</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.loadingRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.loadingCard} />
            ))}
          </View>
        </ScrollView>
      </GlassView>
    )
  }

  if (error || !data?.topics?.length) {
    return null
  }

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={styles.headerTitle}>מה חם בישראל</Text>
          <Text style={styles.headerSubtitle}>What's Trending in Israel</Text>
        </View>
        <Pressable
          onPress={fetchTrending}
          style={({ hovered }) => [styles.refreshButton, hovered && styles.refreshButtonHovered]}
        >
          <RefreshCw size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Overall Mood */}
      {data.overall_mood && (
        <Text style={styles.moodText}>🇮🇱 {data.overall_mood}</Text>
      )}

      {/* Topics Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsScroll}>
        {data.topics.map((topic, index) => {
          const sentimentColors = getSentimentColors(topic.sentiment)
          return (
            <Pressable
              key={index}
              onPress={() => onTopicClick?.(topic)}
              style={({ hovered }) => [
                styles.topicCard,
                sentimentColors,
                hovered && styles.topicCardHovered,
              ]}
            >
              <View style={styles.topicHeader}>
                <Text style={styles.topicEmoji}>{getCategoryEmoji(topic.category)}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{topic.category_label?.he}</Text>
                </View>
              </View>

              <Text style={styles.topicTitle} numberOfLines={2}>{topic.title}</Text>

              {topic.summary && (
                <Text style={styles.topicSummary} numberOfLines={2}>{topic.summary}</Text>
              )}

              {/* Importance indicator */}
              <View style={styles.importanceRow}>
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.importanceDot,
                      i < Math.ceil(topic.importance / 2) && styles.importanceDotActive,
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Top Story Highlight */}
      {data.top_story && (
        <View style={styles.topStory}>
          <View style={styles.topStoryBadge}>
            <Text style={styles.topStoryLabel}>TOP STORY</Text>
          </View>
          <Text style={styles.topStoryText}>{data.top_story}</Text>
        </View>
      )}

      {/* Sources */}
      {data.sources && data.sources.length > 0 && (
        <View style={styles.sourcesRow}>
          <Text style={styles.sourcesLabel}>מקורות:</Text>
          {data.sources.map((source, i) => (
            <Text key={source} style={styles.sourceText}>
              {source}{i < data.sources!.length - 1 ? ',' : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

export function TrendingBar() {
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await trendingService.getTopics()
        setTopics(data.topics?.slice(0, 3) || [])
      } catch (err) {
        logger.error('Failed to fetch trending', 'TrendingBar', err)
      }
    }

    fetchTopics()
    const interval = setInterval(fetchTopics, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!topics.length) return null

  return (
    <View style={styles.bar}>
      <TrendingUp size={16} color={colors.primary} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.barTopics}>
          {topics.map((topic, i) => (
            <View key={i} style={styles.barTopic}>
              <Text style={styles.barTopicText}>{topic.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
  },
  refreshButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingCard: {
    width: 192,
    height: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
  },
  moodText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
    paddingRight: spacing.xs,
  },
  topicsScroll: {
    marginBottom: spacing.md,
  },
  topicCard: {
    minWidth: 200,
    maxWidth: 280,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  topicCardHovered: {
    transform: [{ scale: 1.02 }],
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  topicEmoji: {
    fontSize: 24,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  topicSummary: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  importanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  importanceDotActive: {
    backgroundColor: colors.primary,
  },
  topStory: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundImage: 'linear-gradient(to right, rgba(0, 217, 255, 0.1), rgba(138, 43, 226, 0.1))' as any,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topStoryBadge: {
    marginBottom: spacing.xs,
  },
  topStoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  topStoryText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sourcesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sourcesLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sourceText: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTopics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTopic: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  barTopicText: {
    fontSize: 12,
    color: colors.text,
  },
})
