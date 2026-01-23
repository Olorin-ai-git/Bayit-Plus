import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView } from '@bayit/shared/ui'
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
    <View
      className="absolute bottom-full mb-2 -translate-x-1/2 z-50"
      style={{ left: position.x }}
    >
      <GlassView className="px-4 py-2" intensity="high">
        <Text className="text-sm font-medium text-white text-right">
          {chapter.title}
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <Text className="text-xs text-gray-400">
            {t(`chapters.categories.${chapter.category}`, chapter.category)}
          </Text>
          <Text className="text-xs text-gray-400">•</Text>
          <Text className="text-xs text-gray-400 tabular-nums">
            {formatTime(chapter.start_time)}
          </Text>
        </View>
      </GlassView>
      {/* Tooltip arrow */}
      <View className="absolute left-1/2 top-full -ml-1 -mt-1 w-2 h-2 bg-white/10 rotate-45" />
    </View>
  )
}
