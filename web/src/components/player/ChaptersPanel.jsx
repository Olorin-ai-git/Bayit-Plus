import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { List, X, Loader2 } from 'lucide-react'
import ChapterCard from './ChapterCard'

export default function ChaptersPanel({
  chapters = [],
  currentTime = 0,
  duration = 0,
  isLoading = false,
  isOpen = false,
  onClose,
  onSeek,
  className = '',
}) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const activeChapterRef = useRef(null)

  // Find active chapter based on current time
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
  )

  // Auto-scroll to active chapter
  useEffect(() => {
    if (activeChapterRef.current && panelRef.current) {
      activeChapterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeChapterIndex])

  const handleChapterClick = (chapter) => {
    onSeek?.(chapter.start_time)
  }

  if (!isOpen) return null

  return (
    <div
      className={`
        absolute top-0 left-0 h-full w-72 z-40
        glass-strong rounded-r-xl
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${className}
      `}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <List size={18} className="text-primary-400" />
          <h3 className="font-semibold">{t('chapters.title')}</h3>
          <span className="text-xs text-dark-400">
            ({chapters.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="glass-btn-ghost glass-btn-icon-sm"
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Chapters List */}
      <div
        ref={panelRef}
        className="overflow-y-auto p-3 space-y-2"
        style={{ height: 'calc(100% - 60px)' }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-dark-400">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-sm">{t('chapters.generating')}</span>
          </div>
        ) : chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-dark-400">
            <List size={32} className="mb-2 opacity-50" />
            <span className="text-sm">{t('chapters.noChapters')}</span>
          </div>
        ) : (
          chapters.map((chapter, index) => (
            <div
              key={`${chapter.start_time}-${index}`}
              ref={index === activeChapterIndex ? activeChapterRef : null}
            >
              <ChapterCard
                chapter={chapter}
                isActive={index === activeChapterIndex}
                onClick={() => handleChapterClick(chapter)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
