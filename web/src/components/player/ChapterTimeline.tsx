import { useState, useRef } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

// Category colors matching ChapterCard
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
  cliffhanger: '#8B5CF6', // violet-500
  main: '#2563EB',       // blue-600
}

interface Chapter {
  title: string
  category: string
  start_time: number
  end_time: number
}

interface ChapterTimelineProps {
  chapters?: Chapter[]
  duration?: number
  currentTime?: number
  onSeek?: (time: number) => void
  style?: any
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ChapterTimeline({
  chapters = [],
  duration = 0,
  currentTime = 0,
  onSeek,
  style,
}: ChapterTimelineProps) {
  const { t } = useTranslation()
  const [hoveredChapter, setHoveredChapter] = useState<Chapter | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, visible: false })
  const containerRef = useRef<View>(null)

  if (!chapters.length || !duration) return null

  const handleChapterClick = (chapter: Chapter) => {
    onSeek?.(chapter.start_time)
  }

  const handleMouseEnter = (chapter: Chapter, e: any) => {
    const rect = (containerRef.current as any)?.getBoundingClientRect?.()
    if (rect) {
      const x = e.clientX - rect.left
      setTooltipPosition({ x, visible: true })
    }
    setHoveredChapter(chapter)
  }

  const handleMouseLeave = () => {
    setHoveredChapter(null)
    setTooltipPosition({ x: 0, visible: false })
  }

  const getChapterColor = (category: string): string => {
    return categoryColors[category] || colors.primary
  }

  return (
    <View ref={containerRef} style={[styles.container, style]}>
      {/* Chapter markers */}
      {chapters.map((chapter, index) => {
        const startPercent = (chapter.start_time / duration) * 100
        const widthPercent = ((chapter.end_time - chapter.start_time) / duration) * 100
        const chapterColor = getChapterColor(chapter.category)
        const isActive = currentTime >= chapter.start_time && currentTime < chapter.end_time

        return (
          <Pressable
            key={`${chapter.start_time}-${index}`}
            onPress={() => handleChapterClick(chapter)}
            onHoverIn={(e) => handleMouseEnter(chapter, e)}
            onHoverOut={handleMouseLeave}
            style={[
              styles.chapterSegment,
              {
                left: `${startPercent}%` as any,
                width: `${widthPercent}%` as any,
              },
            ]}
          >
            {/* Marker line at chapter start */}
            {index > 0 && (
              <View
                style={[
                  styles.markerLine,
                  { backgroundColor: chapterColor },
                ]}
              />
            )}

            {/* Hover/Active highlight */}
            <View
              style={[
                styles.highlight,
                isActive && { backgroundColor: `${chapterColor}33` },
              ]}
            />
          </Pressable>
        )
      })}

      {/* Tooltip */}
      {hoveredChapter && tooltipPosition.visible && (
        <View
          style={[
            styles.tooltipContainer,
            { left: tooltipPosition.x },
          ]}
        >
          <GlassView style={styles.tooltip} intensity="high">
            <Text style={styles.tooltipTitle}>{hoveredChapter.title}</Text>
            <View style={styles.tooltipMeta}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: getChapterColor(hoveredChapter.category) },
                ]}
              />
              <Text style={styles.tooltipCategory}>
                {t(`chapters.categories.${hoveredChapter.category}`, hoveredChapter.category)}
              </Text>
              <Text style={styles.tooltipDivider}>•</Text>
              <Text style={styles.tooltipTime}>
                {formatTime(hoveredChapter.start_time)}
              </Text>
            </View>
          </GlassView>
          {/* Tooltip arrow */}
          <View style={styles.tooltipArrow} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  chapterSegment: {
    position: 'absolute',
    top: 0,
    height: '100%',
    cursor: 'pointer',
  } as any,
  markerLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 2,
    height: '100%',
    opacity: 0.6,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.sm,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: spacing.sm,
    transform: [{ translateX: -50 }],
    zIndex: 50,
  } as any,
  tooltip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  tooltipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipCategory: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tooltipDivider: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tooltipTime: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  tooltipArrow: {
    position: 'absolute',
    left: '50%',
    top: '100%',
    marginLeft: -4,
    marginTop: -4,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '45deg' }],
  } as any,
})
