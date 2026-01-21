/**
 * ProgressBar Component
 * Displays video progress with seek functionality
 */

import { View, Pressable } from 'react-native'
import { colors } from '@bayit/shared/theme'
import ChapterTimeline from './ChapterTimeline'
import { Chapter } from './types'

interface ProgressBarProps {
  currentTime: number
  duration: number
  chapters?: Chapter[]
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void
  onChapterSeek?: (time: number) => void
}

export default function ProgressBar({
  currentTime,
  duration,
  chapters = [],
  onSeek,
  onChapterSeek,
}: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Pressable onPress={onSeek as any} className="h-1.5 relative">
      {chapters.length > 0 && onChapterSeek && (
        <ChapterTimeline
          chapters={chapters}
          duration={duration}
          currentTime={currentTime}
          onSeek={onChapterSeek}
        />
      )}
      <View className="h-1.5 bg-white/20 rounded overflow-hidden">
        <View
          className="h-full rounded"
          style={{
            width: `${progress}%`,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
          }}
        />
      </View>
    </Pressable>
  )
}
