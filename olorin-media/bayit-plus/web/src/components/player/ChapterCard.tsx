import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'

// Category colors for chapter markers
const categoryColors: Record<string, string> = {
  general: colors.textMuted,
  intro: colors.primary.DEFAULT,
  news: colors.error.DEFAULT,
  security: '#F97316',
  politics: colors.primary.DEFAULT,
  economy: colors.success.DEFAULT,
  sports: colors.warning.DEFAULT,
  weather: '#06B6D4',
  culture: '#EC4899',
  conclusion: colors.textMuted,
  flashback: '#6366F1',
  journey: '#14B8A6',
  climax: '#F43F5E',
  setup: colors.warning.DEFAULT,
  action: colors.error.DEFAULT,
  conflict: '#EA580C',
  cliffhanger: '#8B5CF6',
  main: colors.primary.DEFAULT,
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
  const categoryColor = categoryColors[chapter.category || 'general'] || colors.primary.DEFAULT

  return (
    <Pressable onPress={onClick}>
      {({ hovered }) => (
        <GlassView
          style={[
            styles.card,
            isActive && styles.cardActive,
            hovered && !isActive && styles.cardHovered,
            isActive && { shadowColor: colors.primary.DEFAULT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }
          ]}
          intensity={isActive ? 'high' : 'medium'}
          borderColor={isActive ? colors.primary.DEFAULT : undefined}
        >
          <View style={styles.cardContent}>
            {/* Category indicator */}
            <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />

            <View style={styles.contentWrapper}>
              {/* Title and time */}
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.titleBase,
                    isActive ? styles.textActive : styles.textInactive
                  ]}
                  numberOfLines={1}
                >
                  {chapter.title}
                </Text>
                <Text style={styles.timeText}>
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
                    <Text style={[styles.currentText, { color: colors.primary.DEFAULT }]}>
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
                isActive && { backgroundColor: colors.primary.DEFAULT },
                !isActive && (hovered ? styles.playBgHovered : styles.playBgDefault),
              ]}
            >
              <Play
                size={14}
                fill={isActive ? colors.white : 'none'}
                color={isActive ? colors.white : colors.textMuted}
              />
            </View>
          </View>
        </GlassView>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  cardActive: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardHovered: {
    backgroundColor: colors.glassLight,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIndicator: {
    width: 4,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  contentWrapper: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBase: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  textActive: {
    color: colors.white,
    fontWeight: '600',
  },
  textInactive: {
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
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
  currentText: {
    fontSize: 11,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBgDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playBgHovered: {
    backgroundColor: colors.glassLight,
  },
})

