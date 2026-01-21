import React from 'react'
import { Clock, Info } from 'lucide-react'
import { EPGProgram } from '@/services/epgApi'
import { DateTime } from 'luxon'

interface EPGProgramCardProps {
  program: EPGProgram
  channelName: string
  timezone: 'israel' | 'local'
  onClick?: (program: EPGProgram) => void
}

const EPGProgramCard: React.FC<EPGProgramCardProps> = ({
  program,
  channelName,
  timezone,
  onClick
}) => {
  const zoneName = timezone === 'israel' ? 'Asia/Jerusalem' : 'local'

  // Format time
  const startTime = DateTime.fromISO(program.start_time).setZone(zoneName)
  const endTime = DateTime.fromISO(program.end_time).setZone(zoneName)
  const timeLabel = `${startTime.toFormat('HH:mm')} - ${endTime.toFormat('HH:mm')}`

  // Visual states
  const isPast = program.is_past
  const isNow = program.is_now

  return (
    <button
      onClick={() => onClick?.(program)}
      className={`
        group w-full flex items-start gap-4 p-4 bg-black/20 backdrop-blur-xl rounded-xl border border-white/10
        hover:border-primary/40 hover:bg-black/30 transition-all text-left
        ${isNow ? 'ring-2 ring-primary/40 bg-primary/10' : ''}
        ${isPast ? 'opacity-60' : ''}
      `}
    >
      {/* Thumbnail */}
      {program.thumbnail ? (
        <img
          src={program.thumbnail}
          alt={program.title}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-24 h-24 flex items-center justify-center bg-black/40 rounded-lg flex-shrink-0">
          <span className="text-4xl">📺</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors line-clamp-2">
            {program.title}
          </h3>
          {isNow && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse flex-shrink-0">
              LIVE
            </span>
          )}
        </div>

        {/* Channel & Time */}
        <div className="flex items-center gap-3 text-sm text-white/70 mb-2">
          <span className="font-medium">{channelName}</span>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{timeLabel}</span>
          </div>
          {program.category && (
            <>
              <span className="text-white/40">•</span>
              <span>{program.category}</span>
            </>
          )}
        </div>

        {/* Description */}
        {program.description && (
          <p className="text-sm text-white/60 line-clamp-2 mb-2">{program.description}</p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          {program.genres && program.genres.length > 0 && (
            <div className="flex items-center gap-1">
              {program.genres.slice(0, 3).map((genre, index) => (
                <span key={index} className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full">
                  {genre}
                </span>
              ))}
            </div>
          )}
          {program.rating && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              {program.rating}
            </span>
          )}
        </div>
      </div>

      {/* Action Hint */}
      <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Info size={20} className="text-primary" />
      </div>
    </button>
  )
}

export default EPGProgramCard
