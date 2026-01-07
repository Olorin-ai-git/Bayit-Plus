import { Link } from 'react-router-dom'
import { Play, Info, Plus } from 'lucide-react'

export default function HeroSection({ content }) {
  if (!content) return null

  return (
    <section className="relative h-[60vh] min-h-[400px] max-h-[700px]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={content.backdrop || content.thumbnail}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-dark-900/20 to-dark-900/70" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-end pb-16">
        <div className="max-w-2xl animate-slide-up">
          {/* Category/Type Badge */}
          {content.category && (
            <span className="glass-badge-primary glass-badge-lg mb-4 inline-block">
              {content.category}
            </span>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
            {content.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-dark-300 mb-4">
            {content.year && <span>{content.year}</span>}
            {content.duration && <span>{content.duration}</span>}
            {content.rating && (
              <span className="glass-badge">
                {content.rating}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-dark-200 text-lg leading-relaxed mb-6 line-clamp-3">
            {content.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              to={`/vod/${content.id}`}
              className="glass-btn-primary glass-btn-lg group"
            >
              <Play size={20} fill="currentColor" className="group-hover:scale-110 transition-transform" />
              צפייה
            </Link>
            <Link
              to={`/vod/${content.id}?info=true`}
              className="glass-btn-secondary glass-btn-lg"
            >
              <Info size={20} />
              מידע נוסף
            </Link>
            <button
              className="glass-btn-ghost glass-btn-icon hover-glow"
              aria-label="הוסף לרשימה"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
