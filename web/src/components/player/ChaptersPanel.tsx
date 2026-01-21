import { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { List, X } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
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
      className={`absolute top-0 right-0 h-full w-72 z-40 rounded-tl-lg rounded-bl-lg transition-transform ${
        isOpen ? 'translate-x-0' : 'translate-x-72'
      }`}
      intensity="high"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-white/10">
        <View className="flex-row items-center gap-2">
          <List size={18} color={colors.primary} />
          <Text className="text-base font-semibold text-white">{t('chapters.title')}</Text>
          <Text className="text-xs text-gray-500">({chapters.length})</Text>
        </View>
        <Pressable
          onPress={onClose}
          className="w-8 h-8 rounded-lg items-center justify-center hover:bg-white/10"
          accessibilityLabel={t('common.close')}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Chapters List */}
      <ScrollView
        ref={panelRef}
        className="flex-1"
        contentContainerStyle={{ padding: 8, gap: 8 }}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-gray-500 mt-2">{t('chapters.generating')}</Text>
          </View>
        ) : chapters.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <List size={32} color={colors.textMuted} className="opacity-50 mb-2" />
            <Text className="text-sm text-gray-500 mt-2">{t('chapters.noChapters')}</Text>
          </View>
        ) : (
          chapters.map((chapter, index) => (
            <View key={`${chapter.start_time}-${index}`} className="mb-2">
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

