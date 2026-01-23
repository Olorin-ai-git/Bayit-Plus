import { View, Pressable } from 'react-native'
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
      className="absolute top-0 h-full cursor-pointer"
      style={{
        left: `${startPercent}%` as any,
        width: `${widthPercent}%` as any,
      }}
    >
      {/* Marker line at chapter start */}
      {index > 0 && (
        <View
          className="absolute left-0 top-0 w-0.5 h-full opacity-60"
          style={{ backgroundColor: chapterColor }}
        />
      )}

      {/* Hover/Active highlight */}
      <View
        className="absolute inset-0 rounded-sm"
        style={isActive ? { backgroundColor: `${chapterColor}33` } : undefined}
      />
    </Pressable>
  )
}
