import React from 'react'
import { Clock, Circle } from 'lucide-react'
import { EPGProgram } from '@/services/epgApi'
import { DateTime } from 'luxon'
import EPGRecordingIndicator, { RecordingStatus } from './EPGRecordingIndicator'

interface EPGTimeSlotProps {
  program: EPGProgram
  timezone: 'israel' | 'local'
  cellWidth: number
  cellHeight: number
  recordingStatus?: RecordingStatus
  isPremium?: boolean
  onClick?: (program: EPGProgram) => void
  onRecordClick?: (program: EPGProgram, event: React.MouseEvent) => void
}

const EPGTimeSlot: React.FC<EPGTimeSlotProps> = ({
  program,
  timezone,
  cellWidth,
  cellHeight,
  recordingStatus = 'none',
  isPremium = false,
  onClick,
  onRecordClick
}) => {
  const zoneName = timezone === 'israel' ? 'Asia/Jerusalem' : 'local'

  // Format time
  const startTime = DateTime.fromISO(program.start_time).setZone(zoneName)
  const endTime = DateTime.fromISO(program.end_time).setZone(zoneName)
  const timeLabel = `${startTime.toFormat('HH:mm')} - ${endTime.toFormat('HH:mm')}`

  // Calculate width based on duration
  const durationMinutes = endTime.diff(startTime, 'minutes').minutes
  const widthMultiplier = durationMinutes / 30 // 30-minute intervals
  const width = cellWidth * widthMultiplier

  // Visual states
  const isPast = program.is_past
  const isNow = program.is_now
  const isFuture = program.is_future

  return (
    <button
      onClick={() => onClick?.(program)}
      className={`
        group relative flex-shrink-0 p-3 border-r border-white/5 text-left transition-all
        ${isNow ? 'bg-primary/20 border-primary/40 ring-2 ring-primary/30' : 'bg-black/10 backdrop-blur-sm'}
        ${isPast ? 'opacity-60' : ''}
        ${isFuture ? 'hover:bg-white/5' : ''}
        hover:scale-[1.02] hover:shadow-lg hover:z-10
      `}
      style={{
        width: `${width}px`,
        minWidth: `${cellWidth}px`,
        height: `${cellHeight}px`
      }}
      aria-label={`${program.title} - ${timeLabel}`}
    >
      {/* Content */}
      <div className="flex flex-col gap-1 h-full overflow-hidden">
        {/* Title */}
        <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary transition-colors">
          {program.title}
        </h4>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-white/60">
          <Clock size={12} />
          <span>{timeLabel}</span>
        </div>

        {/* Category */}
        {program.category && (
          <span className="text-xs text-white/50 truncate">{program.category}</span>
        )}
      </div>

      {/* "Now" Badge */}
      {isNow && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          LIVE
        </div>
      )}

      {/* Recording Indicator */}
      <EPGRecordingIndicator status={recordingStatus} size="sm" />

      {/* Record Button (only for future programs and premium users) */}
      {isFuture && isPremium && onRecordClick && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRecordClick(program, e)
          }}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-full shadow-lg"
          aria-label="Record"
        >
          <Circle size={14} className="text-white" />
        </button>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </button>
  )
}

export default EPGTimeSlot
