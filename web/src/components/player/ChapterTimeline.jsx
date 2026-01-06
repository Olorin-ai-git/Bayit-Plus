import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

// Category colors matching ChapterCard
const categoryColors = {
  intro: 'bg-blue-500',
  news: 'bg-red-500',
  security: 'bg-orange-500',
  politics: 'bg-purple-500',
  economy: 'bg-green-500',
  sports: 'bg-yellow-500',
  weather: 'bg-cyan-500',
  culture: 'bg-pink-500',
  conclusion: 'bg-gray-500',
  flashback: 'bg-indigo-500',
  journey: 'bg-teal-500',
  climax: 'bg-rose-500',
  setup: 'bg-amber-500',
  action: 'bg-red-600',
  conflict: 'bg-orange-600',
  cliffhanger: 'bg-violet-500',
  main: 'bg-blue-600',
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function ChapterTimeline({
  chapters = [],
  duration = 0,
  currentTime = 0,
  onSeek,
  className = '',
}) {
  const { t } = useTranslation()
  const [hoveredChapter, setHoveredChapter] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, visible: false })
  const containerRef = useRef(null)

  if (!chapters.length || !duration) return null

  const handleChapterClick = (chapter, e) => {
    e.stopPropagation()
    onSeek?.(chapter.start_time)
  }

  const handleMouseEnter = (chapter, e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      setTooltipPosition({ x, visible: true })
    }
    setHoveredChapter(chapter)
  }

  const handleMouseLeave = () => {
    setHoveredChapter(null)
    setTooltipPosition({ x: 0, visible: false })
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-x-0 top-0 h-full pointer-events-none ${className}`}
    >
      {/* Chapter markers */}
      {chapters.map((chapter, index) => {
        const startPercent = (chapter.start_time / duration) * 100
        const widthPercent = ((chapter.end_time - chapter.start_time) / duration) * 100
        const colorClass = categoryColors[chapter.category] || 'bg-primary-500'
        const isActive = currentTime >= chapter.start_time && currentTime < chapter.end_time

        return (
          <div
            key={`${chapter.start_time}-${index}`}
            className="pointer-events-auto absolute top-0 h-full cursor-pointer group"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
            onClick={(e) => handleChapterClick(chapter, e)}
            onMouseEnter={(e) => handleMouseEnter(chapter, e)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Marker line at chapter start */}
            {index > 0 && (
              <div
                className={`
                  absolute left-0 top-0 w-0.5 h-full
                  ${colorClass} opacity-60
                  transition-opacity duration-200
                  group-hover:opacity-100
                `}
              />
            )}

            {/* Hover highlight */}
            <div
              className={`
                absolute inset-0 rounded-sm transition-all duration-200
                ${isActive ? `${colorClass}/20` : 'group-hover:bg-white/5'}
              `}
            />
          </div>
        )
      })}

      {/* Tooltip */}
      {hoveredChapter && tooltipPosition.visible && (
        <div
          className="absolute bottom-full mb-2 transform -translate-x-1/2 pointer-events-none z-50"
          style={{ left: tooltipPosition.x }}
        >
          <div className="glass-strong rounded-lg px-3 py-2 text-sm whitespace-nowrap shadow-xl" dir="rtl">
            <div className="font-medium text-white">{hoveredChapter.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${categoryColors[hoveredChapter.category] || 'bg-primary-500'}`} />
              <span className="text-xs text-dark-400">
                {t(`chapters.categories.${hoveredChapter.category}`, hoveredChapter.category)}
              </span>
              <span className="text-xs text-dark-500">•</span>
              <span className="text-xs text-dark-400 tabular-nums">
                {formatTime(hoveredChapter.start_time)}
              </span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 glass-strong -mt-1" />
        </div>
      )}
    </div>
  )
}
