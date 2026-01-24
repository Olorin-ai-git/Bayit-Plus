import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Channel, EPGProgram } from '@/services/epgApi'
import EPGTimeline from './EPGTimeline'
import EPGChannelRow from './EPGChannelRow'
import { RecordingStatus } from './EPGRecordingIndicator'

interface EPGGridProps {
  channels: Channel[]
  programs: EPGProgram[]
  startTime: Date
  endTime: Date
  timezone: 'israel' | 'local'
  cellWidth?: number
  cellHeight?: number
  onProgramClick?: (program: EPGProgram) => void
  isPremium?: boolean
  getRecordingStatus?: (program: EPGProgram) => RecordingStatus
  onRecordClick?: (program: EPGProgram, event: React.MouseEvent) => void
}

const EPGGrid: React.FC<EPGGridProps> = ({
  channels,
  programs,
  startTime,
  endTime,
  timezone,
  cellWidth = 200,
  cellHeight = 100,
  onProgramClick,
  isPremium = false,
  getRecordingStatus,
  onRecordClick
}) => {
  if (channels.length === 0) {
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </View>
          <Text style={styles.emptyStateTitle}>No TV Guide Data Available</Text>
          <Text style={styles.emptyStateMessage}>
            The TV programming schedule is currently unavailable. Please check back later or contact support if this persists.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.timelineHeader}>
        <EPGTimeline
          startTime={startTime}
          endTime={endTime}
          timezone={timezone}
          intervalMinutes={30}
          cellWidth={cellWidth}
        />
      </View>

      <ScrollView style={styles.channelRowsContainer}>
        {channels.map(channel => (
          <EPGChannelRow
            key={channel.id}
            channel={channel}
            programs={programs}
            startTime={startTime}
            endTime={endTime}
            timezone={timezone}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            onProgramClick={onProgramClick}
            isPremium={isPremium}
            getRecordingStatus={getRecordingStatus}
            onRecordClick={onRecordClick}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  timelineHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  channelRowsContainer: {
    maxHeight: 'calc(100vh - 300px)',
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

export default EPGGrid
