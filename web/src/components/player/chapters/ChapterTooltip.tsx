import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { Chapter, formatTime, getChapterColor } from './constants'

interface ChapterTooltipProps {
  chapter: Chapter
  position: {
    x: number
    visible: boolean
  }
}

export default function ChapterTooltip({
  chapter,
  position,
}: ChapterTooltipProps) {
  const { t } = useTranslation()
  const categoryColor = getChapterColor(chapter.category)

  if (!position.visible) return null

  return (
    <View style={[styles.container, { left: position.x }]}>
      <GlassView style={styles.content} intensity="high">
        <Text style={styles.title}>{chapter.title}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={styles.metaText}>
            {t(`chapters.categories.${chapter.category}`, chapter.category)}
          </Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={[styles.metaText, styles.tabularNums]}>
            {formatTime(chapter.start_time)}
          </Text>
        </View>
      </GlassView>
      <View style={styles.arrow} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: spacing[2],
    transform: [{ translateX: '-50%' }],
    zIndex: 50,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    top: '100%',
    marginLeft: -4,
    marginTop: -4,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '45deg' }],
  },
})
