import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Channel, EPGProgram } from '@/services/epgApi'
import EPGProgramCard from './EPGProgramCard'

interface EPGListProps {
  channels: Channel[]
  programs: EPGProgram[]
  timezone: 'israel' | 'local'
  onProgramClick?: (program: EPGProgram) => void
}

const EPGList: React.FC<EPGListProps> = ({
  channels,
  programs,
  timezone,
  onProgramClick
}) => {
  const channelMap = useMemo(() => {
    return channels.reduce((map, channel) => {
      map[channel.id] = channel
      return map
    }, {} as Record<string, Channel>)
  }, [channels])

  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })
  }, [programs])

  if (sortedPrograms.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateIcon}>
            <svg
              style={styles.emptyStateIconSvg}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </View>
          <Text style={styles.emptyStateTitle}>No Programs Found</Text>
          <Text style={styles.emptyStateMessage}>
            No programs are available for the selected time range. Try adjusting your filters or check back later.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {sortedPrograms.map(program => {
        const channel = channelMap[program.channel_id]
        if (!channel) return null

        return (
          <EPGProgramCard
            key={program.id}
            program={program}
            channelName={channel.name}
            timezone={timezone}
            onClick={onProgramClick}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  emptyStateContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 48,
  },
  emptyStateContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 16,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconSvg: {
    width: 40,
    height: 40,
    color: '#a855f7',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyStateMessage: {
    color: 'rgba(255, 255, 255, 0.6)',
    maxWidth: 448,
    textAlign: 'center',
  },
})

export default EPGList
