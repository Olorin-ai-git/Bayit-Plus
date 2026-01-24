/**
 * Program information section for EPG recording modal
 * Displays program title, channel, time, and duration
 * @module epg/record/ProgramInfoSection
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { useDirection } from '@/hooks/useDirection'
import { EPGProgram } from '@/services/epgApi'

/**
 * Props schema
 */
const ProgramInfoSectionPropsSchema = z.object({
  program: z.custom<EPGProgram>(),
  channelName: z.string().min(1),
})

type ProgramInfoSectionProps = z.infer<typeof ProgramInfoSectionPropsSchema>

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  return `${mins}m`
}

/**
 * Program information section component
 */
const ProgramInfoSection: React.FC<ProgramInfoSectionProps> = ({
  program,
  channelName,
}) => {
  const { t } = useTranslation()
  const { flexDirection, textAlign } = useDirection()

  const startTime = DateTime.fromISO(program.start_time)
  const endTime = DateTime.fromISO(program.end_time)
  const durationFormatted = formatDuration(program.duration_seconds)

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>{program.title}</Text>

      <View style={[styles.metaRow, { flexDirection }]}>
        <Text style={styles.metaLabel}>{t('epg.channel')}:</Text>
        <Text style={styles.metaValue}>{channelName}</Text>
      </View>

      <View style={[styles.timeRow, { flexDirection }]}>
        <Clock size={14} color="rgba(255, 255, 255, 0.6)" />
        <Text style={styles.timeText}>
          {startTime.toFormat('HH:mm')} - {endTime.toFormat('HH:mm')}
        </Text>
        <Text style={styles.timeDivider}>•</Text>
        <Text style={styles.timeText}>{durationFormatted}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  metaValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timeDivider: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.5,
  },
})

export default ProgramInfoSection
