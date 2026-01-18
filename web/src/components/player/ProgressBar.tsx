/**
 * ProgressBar Component
 * Displays video progress with seek functionality
 */

import { View, Pressable, StyleSheet } from 'react-native'
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
    <Pressable onPress={onSeek as any} style={styles.container}>
      {chapters.length > 0 && onChapterSeek && (
        <ChapterTimeline
          chapters={chapters}
          duration={duration}
          currentTime={currentTime}
          onSeek={onChapterSeek}
        />
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    position: 'relative',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
})
