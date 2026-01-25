import { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { List, X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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

  const handleBackdropClick = (e: any) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    onClose?.()
  }

  const stopPropagation = (e: any) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
  }

  return (
    <>
      {/* Backdrop to close panel when clicking outside */}
      <View
        style={styles.backdrop}
        onClick={handleBackdropClick}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
      />

      {/* Panel */}
      <View
        style={[styles.panel, isOpen ? styles.panelOpen : styles.panelClosed]}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onMouseUp={stopPropagation}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('chapters.title')}</Text>
            <Text style={styles.headerCount}>({chapters.length})</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel={t('common.close')}
          >
            <X size={24} color={colors.white} />
          </Pressable>
        </View>

        {/* Chapters List */}
        <ScrollView
          ref={panelRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
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
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 89,
    // @ts-ignore - Web-specific CSS
    pointerEvents: 'auto',
    cursor: 'default',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: 360,
    zIndex: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto',
  },
  panelOpen: {
    transform: [{ translateX: 0 }],
  },
  panelClosed: {
    transform: [{ translateX: 360 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerCount: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    opacity: 0.3,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  chapterItem: {
    marginBottom: spacing.xs,
  },
});

