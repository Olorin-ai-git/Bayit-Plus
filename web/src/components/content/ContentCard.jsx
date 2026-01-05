import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'

export default function ContentCard({ content, showProgress = false }) {
  const linkTo = content.type === 'live'
    ? `/live/${content.id}`
    : content.type === 'radio'
    ? `/radio/${content.id}`
    : content.type === 'podcast'
    ? `/podcasts/${content.id}`
    : `/vod/${content.id}`

  return (
    <Link
      to={linkTo}
      className="glass-card-hover flex-shrink-0 w-[200px] md:w-[240px] group overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img
          src={content.thumbnail}
          alt={content.title}
          className="w-full h-full object-cover rounded-t-xl"
          loading="lazy"
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full glass flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-glow">
            <Play size={24} fill="white" className="text-white mr-[-2px]" />
          </div>
        </div>

        {/* Duration Badge */}
        {content.duration && (
          <span className="absolute bottom-2 left-2 glass-badge-sm glass">
            {content.duration}
          </span>
        )}

        {/* Live Badge */}
        {content.type === 'live' && (
          <span className="absolute top-2 right-2 live-badge">LIVE</span>
        )}

        {/* Progress Bar */}
        {showProgress && content.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-900/50 backdrop-blur-sm">
            <div
              className="h-full bg-primary-500 shadow-glow"
              style={{ width: `${content.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium truncate mb-1 group-hover:text-primary-400 transition-colors">{content.title}</h3>
        <div className="flex items-center gap-2 text-xs text-dark-400">
          {content.year && <span>{content.year}</span>}
          {content.category && (
            <>
              {content.year && <span className="text-dark-600">|</span>}
              <span>{content.category}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
