import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
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

  const startTime = DateTime.fromISO(program.start_time).setZone(zoneName)
  const endTime = DateTime.fromISO(program.end_time).setZone(zoneName)
  const timeLabel = `${startTime.toFormat('HH:mm')} - ${endTime.toFormat('HH:mm')}`

  const durationMinutes = endTime.diff(startTime, 'minutes').minutes
  const widthMultiplier = durationMinutes / 30
  const width = cellWidth * widthMultiplier

  const isPast = program.is_past
  const isNow = program.is_now
  const isFuture = program.is_future

  const containerStyle = [
    styles.container,
    isNow ? styles.containerNow : styles.containerDefault,
    isPast && styles.containerPast,
    { width: Math.max(width, cellWidth), minWidth: cellWidth, height: cellHeight },
  ]

  return (
    <Pressable
      onPress={() => onClick?.(program)}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && isFuture && styles.containerPressed,
      ]}
      aria-label={`${program.title} - ${timeLabel}`}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {program.title}
        </Text>

        <View style={styles.timeRow}>
          <Clock size={12} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.timeText}>{timeLabel}</Text>
        </View>

        {program.category && (
          <Text style={styles.category} numberOfLines={1}>
            {program.category}
          </Text>
        )}
      </View>

      {isNow && (
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}

      <EPGRecordingIndicator status={recordingStatus} size="sm" />

      {isFuture && isPremium && onRecordClick && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation()
            onRecordClick(program, e as any)
          }}
          style={styles.recordButton}
          aria-label="Record"
        >
          <Circle size={14} color="#ffffff" />
        </Pressable>
      )}

      <View style={styles.hoverOverlay} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexShrink: 0,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  containerDefault: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(8px)',
  },
  containerNow: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderWidth: 2,
  },
  containerPast: {
    opacity: 0.6,
  },
  containerPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  content: {
    flexDirection: 'column',
    gap: 4,
    height: '100%',
    overflow: 'hidden',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  category: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ef4444',
    borderRadius: 12,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  recordButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    opacity: 0,
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0,
    pointerEvents: 'none',
  },
})

export default EPGTimeSlot
