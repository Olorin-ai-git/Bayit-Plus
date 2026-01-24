import { View, Pressable, StyleSheet } from 'react-native'
import { Chapter, getChapterColor } from './constants'

interface ChapterSegmentProps {
  chapter: Chapter
  duration: number
  currentTime: number
  index: number
  onSeek?: (time: number) => void
  onMouseEnter: (chapter: Chapter, event: any) => void
  onMouseLeave: () => void
}

export default function ChapterSegment({
  chapter,
  duration,
  currentTime,
  index,
  onSeek,
  onMouseEnter,
  onMouseLeave,
}: ChapterSegmentProps) {
  const startPercent = (chapter.start_time / duration) * 100
  const widthPercent = ((chapter.end_time - chapter.start_time) / duration) * 100
  const chapterColor = getChapterColor(chapter.category)
  const isActive = currentTime >= chapter.start_time && currentTime < chapter.end_time

  const handlePress = () => {
    onSeek?.(chapter.start_time)
  }

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={(e) => onMouseEnter(chapter, e)}
      onHoverOut={onMouseLeave}
      style={[
        styles.segment,
        {
          left: `${startPercent}%` as any,
          width: `${widthPercent}%` as any,
        },
      ]}
    >
      {index > 0 && (
        <View style={[styles.markerLine, { backgroundColor: chapterColor }]} />
      )}
      <View
        style={[
          styles.highlight,
          isActive && { backgroundColor: `${chapterColor}33` },
        ]}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    top: 0,
    height: '100%',
    cursor: 'pointer',
  },
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
    borderRadius: 2,
  },
})
