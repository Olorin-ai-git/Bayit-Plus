import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

// Category colors for chapter markers
const categoryColors: Record<string, string> = {
  intro: '#3B82F6',      // blue-500
  news: '#EF4444',       // red-500
  security: '#F97316',   // orange-500
  politics: '#A855F7',   // purple-500
  economy: '#22C55E',    // green-500
  sports: '#EAB308',     // yellow-500
  weather: '#06B6D4',    // cyan-500
  culture: '#EC4899',    // pink-500
  conclusion: '#6B7280', // gray-500
  flashback: '#6366F1',  // indigo-500
  journey: '#14B8A6',    // teal-500
  climax: '#F43F5E',     // rose-500
  setup: '#F59E0B',      // amber-500
  action: '#DC2626',     // red-600
  conflict: '#EA580C',   // orange-600
  cliffhanger: '#8B5CF6',// violet-500
  main: '#2563EB',       // blue-600
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface Chapter {
  title: string
  category?: string
  start_time: number
  end_time: number
}

interface ChapterCardProps {
  chapter: Chapter
  isActive?: boolean
  onClick?: () => void
  showCategory?: boolean
}

export default function ChapterCard({
  chapter,
  isActive = false,
  onClick,
  showCategory = true,
}: ChapterCardProps) {
  const { t } = useTranslation()
  const categoryColor = categoryColors[chapter.category || ''] || colors.primary

  return (
    <Pressable onPress={onClick}>
      {({ hovered }) => (
        <GlassView
          style={[
            styles.container,
            isActive && styles.containerActive,
            hovered && !isActive && styles.containerHovered,
          ]}
          intensity={isActive ? 'high' : 'medium'}
          borderColor={isActive ? colors.primary : undefined}
        >
          <View style={styles.content}>
            {/* Category indicator */}
            <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />

            <View style={styles.mainContent}>
              {/* Title and time */}
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, isActive && styles.titleActive]}
                  numberOfLines={1}
                >
                  {chapter.title}
                </Text>
                <Text style={styles.time}>
                  {formatTime(chapter.start_time)}
                </Text>
              </View>

              {/* Category badge */}
              {showCategory && (
                <View style={styles.badgeRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}33` }]}>
                    <Text style={styles.categoryText}>
                      {t(`chapters.categories.${chapter.category}`, chapter.category || '')}
                    </Text>
                  </View>
                  {isActive && (
                    <Text style={styles.currentLabel}>
                      {t('chapters.current')}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Play indicator */}
            <View
              style={[
                styles.playButton,
                isActive && styles.playButtonActive,
                hovered && !isActive && styles.playButtonHovered,
              ]}
            >
              <Play
                size={14}
                fill={isActive ? colors.text : 'none'}
                color={isActive ? colors.text : colors.textMuted}
              />
            </View>
          </View>
        </GlassView>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  containerActive: {
    borderWidth: 1,
    borderColor: `${colors.primary}80`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  containerHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  titleActive: {
    color: colors.primary,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  currentLabel: {
    fontSize: 11,
    color: colors.primary,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
})
