import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
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
    <View style={styles.container}>
      <View style={styles.timeSlotContainer}>
        {timeSlots.map((slot, index) => (
          <View
            key={index}
            style={[styles.timeSlot, { width: cellWidth }]}
          >
            <Text style={styles.timeText}>{slot.label}</Text>
          </View>
        ))}
      </View>

      {nowPosition !== null && (
        <>
          <View style={[styles.nowIndicator, { left: `${nowPosition}%` }]}>
            <View style={styles.nowIndicatorDot} />
            <View style={styles.nowIndicatorDotBottom} />
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeSlotContainer: {
    flexDirection: 'row',
  },
  timeSlot: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nowIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10,
  },
  nowIndicatorDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    transform: [{ translateX: -4 }],
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  nowIndicatorDotBottom: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -4 }],
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
})

export default EPGTimeline
