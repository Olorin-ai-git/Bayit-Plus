import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'

// Category colors for chapter markers
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

export default function ChapterCard({
  chapter,
  isActive = false,
  onClick,
  showCategory = true,
}) {
  const { t } = useTranslation()
  const colorClass = categoryColors[chapter.category] || 'bg-primary-500'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-right p-3 rounded-xl transition-all duration-300 group
        ${isActive
          ? 'glass-strong ring-1 ring-primary-500/50 shadow-glow'
          : 'glass hover:bg-white/10'
        }
      `}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        {/* Category indicator */}
        <div className={`w-1 h-12 rounded-full ${colorClass} transition-all duration-300`} />

        <div className="flex-1 min-w-0">
          {/* Title and time */}
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-medium truncate transition-colors ${isActive ? 'text-primary-400' : 'text-white'}`}>
              {chapter.title}
            </h4>
            <span className="text-xs text-dark-400 tabular-nums shrink-0">
              {formatTime(chapter.start_time)}
            </span>
          </div>

          {/* Category badge */}
          {showCategory && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}/20 text-white/80`}>
                {t(`chapters.categories.${chapter.category}`, chapter.category)}
              </span>
              {isActive && (
                <span className="text-xs text-primary-400 animate-pulse">
                  {t('chapters.current')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Play indicator */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
          ${isActive
            ? 'bg-primary-500 text-white'
            : 'bg-white/5 text-dark-400 group-hover:bg-white/10 group-hover:text-white'
          }
        `}>
          <Play size={14} fill={isActive ? 'currentColor' : 'none'} />
        </div>
      </div>
    </button>
  )
}
