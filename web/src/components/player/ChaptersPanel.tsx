import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { List, X, Loader2 } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import ChapterCard from './ChapterCard'

interface Chapter {
  start_time: number
  end_time: number
  title?: string
  summary?: string
}

interface ChaptersPanelProps {
  chapters?: Chapter[]
  currentTime?: number
  duration?: number
  isLoading?: boolean
  isOpen?: boolean
  onClose?: () => void
  onSeek?: (time: number) => void
}

export default function ChaptersPanel({
  chapters = [],
  currentTime = 0,
  duration = 0,
  isLoading = false,
  isOpen = false,
  onClose,
  onSeek,
}: ChaptersPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<ScrollView>(null)

  // Find active chapter based on current time
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
  )

  // Auto-scroll to active chapter
  useEffect(() => {
    if (panelRef.current && activeChapterIndex >= 0) {
      // Scroll to position (approximate since RN ScrollView doesn't have scrollIntoView)
      const scrollPosition = activeChapterIndex * 80 // Approximate card height
      panelRef.current.scrollTo({ y: scrollPosition, animated: true })
    }
  }, [activeChapterIndex])

  const handleChapterClick = (chapter: Chapter) => {
    onSeek?.(chapter.start_time)
  }

  if (!isOpen) return null

  return (
    <GlassView
      style={[
        styles.container,
        isOpen ? styles.containerOpen : styles.containerClosed,
      ]}
      intensity="high"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <List size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>{t('chapters.title')}</Text>
          <Text style={styles.headerCount}>({chapters.length})</Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ hovered }) => [
            styles.closeButton,
            hovered && styles.closeButtonHovered,
          ]}
          accessibilityLabel={t('common.close')}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Chapters List */}
      <ScrollView
        ref={panelRef}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyText}>{t('chapters.generating')}</Text>
          </View>
        ) : chapters.length === 0 ? (
          <View style={styles.emptyState}>
            <List size={32} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>{t('chapters.noChapters')}</Text>
          </View>
        ) : (
          chapters.map((chapter, index) => (
            <View key={`${chapter.start_time}-${index}`} style={styles.chapterItem}>
              <ChapterCard
                chapter={chapter}
                isActive={index === activeChapterIndex}
                onClick={() => handleChapterClick(chapter)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0, // RTL - positioned on the right
    height: '100%',
    width: 288,
    zIndex: 40,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  containerOpen: {
    transform: [{ translateX: 0 }],
  },
  containerClosed: {
    transform: [{ translateX: 288 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  chapterItem: {
    marginBottom: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
})
