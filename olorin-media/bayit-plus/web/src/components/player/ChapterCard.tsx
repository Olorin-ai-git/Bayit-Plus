import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
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
          className={`p-2 rounded-lg ${isActive ? 'border border-purple-500/50 shadow-purple-500/30' : ''} ${hovered && !isActive ? 'bg-white/10' : ''}`}
          intensity={isActive ? 'high' : 'medium'}
          borderColor={isActive ? colors.primary : undefined}
          style={isActive ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 } : undefined}
        >
          <View className="flex-row items-center gap-2">
            {/* Category indicator */}
            <View className="w-1 h-12 rounded-sm" style={{ backgroundColor: categoryColor }} />

            <View className="flex-1 min-w-0">
              {/* Title and time */}
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className={`flex-1 text-sm font-medium text-right ${isActive ? 'text-purple-400' : 'text-white'}`}
                  numberOfLines={1}
                >
                  {chapter.title}
                </Text>
                <Text className="text-xs text-gray-500 tabular-nums">
                  {formatTime(chapter.start_time)}
                </Text>
              </View>

              {/* Category badge */}
              {showCategory && (
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${categoryColor}33` }}>
                    <Text className="text-[11px] text-white/80">
                      {t(`chapters.categories.${chapter.category}`, chapter.category || '')}
                    </Text>
                  </View>
                  {isActive && (
                    <Text className="text-[11px]" style={{ color: colors.primary }}>
                      {t('chapters.current')}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Play indicator */}
            <View
              className={`w-8 h-8 rounded-2xl items-center justify-center ${
                isActive ? '' : hovered ? 'bg-white/10' : 'bg-white/5'
              }`}
              style={isActive ? { backgroundColor: colors.primary } : undefined}
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

