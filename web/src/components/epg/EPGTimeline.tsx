import React, { useMemo } from 'react'
import { DateTime } from 'luxon'

interface EPGTimelineProps {
  startTime: Date
  endTime: Date
  timezone: 'israel' | 'local'
  intervalMinutes?: number
  cellWidth?: number
}

const EPGTimeline: React.FC<EPGTimelineProps> = ({
  startTime,
  endTime,
  timezone,
  intervalMinutes = 30,
  cellWidth = 200
}) => {
  const timeSlots = useMemo(() => {
    const slots: { time: DateTime; label: string }[] = []
    const zoneName = timezone === 'israel' ? 'Asia/Jerusalem' : 'local'

    let current = DateTime.fromJSDate(startTime).setZone(zoneName)
    const end = DateTime.fromJSDate(endTime).setZone(zoneName)

    // Round to nearest interval
    const minutes = current.minute
    const roundedMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes
    current = current.set({ minute: roundedMinutes, second: 0, millisecond: 0 })

    while (current <= end) {
      slots.push({
        time: current,
        label: current.toFormat('HH:mm')
      })
      current = current.plus({ minutes: intervalMinutes })
    }

    return slots
  }, [startTime, endTime, timezone, intervalMinutes])

  // Calculate "now" indicator position
  const nowPosition = useMemo(() => {
    const now = DateTime.now().setZone(timezone === 'israel' ? 'Asia/Jerusalem' : 'local')
    const start = DateTime.fromJSDate(startTime).setZone(timezone === 'israel' ? 'Asia/Jerusalem' : 'local')
    const end = DateTime.fromJSDate(endTime).setZone(timezone === 'israel' ? 'Asia/Jerusalem' : 'local')

    if (now < start || now > end) return null

    const totalDuration = end.diff(start, 'minutes').minutes
    const elapsedDuration = now.diff(start, 'minutes').minutes
    const percentage = (elapsedDuration / totalDuration) * 100

    return percentage
  }, [startTime, endTime, timezone])

  return (
    <div className="relative bg-black/20 backdrop-blur-xl border-b border-white/10">
      {/* Timeline Slots */}
      <div className="flex">
        {timeSlots.map((slot, index) => (
          <div
            key={index}
            className="flex-shrink-0 px-4 py-3 border-r border-white/5 last:border-r-0"
            style={{ width: `${cellWidth}px` }}
          >
            <span className="text-sm font-medium text-white/80">{slot.label}</span>
          </div>
        ))}
      </div>

      {/* "Now" Indicator */}
      {nowPosition !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg shadow-red-500/50 z-10 animate-pulse"
          style={{ left: `${nowPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
      )}
    </div>
  )
}

export default EPGTimeline
