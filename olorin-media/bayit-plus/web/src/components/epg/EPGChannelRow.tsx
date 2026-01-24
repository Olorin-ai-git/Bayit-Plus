import React from 'react'
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native'
import { Channel, EPGProgram } from '@/services/epgApi'
import EPGTimeSlot from './EPGTimeSlot'
import { RecordingStatus } from './EPGRecordingIndicator'

interface EPGChannelRowProps {
  channel: Channel
  programs: EPGProgram[]
  startTime: Date
  endTime: Date
  timezone: 'israel' | 'local'
  cellWidth: number
  cellHeight: number
  onProgramClick?: (program: EPGProgram) => void
  isPremium?: boolean
  getRecordingStatus?: (program: EPGProgram) => RecordingStatus
  onRecordClick?: (program: EPGProgram, event: React.MouseEvent) => void
}

const EPGChannelRow: React.FC<EPGChannelRowProps> = ({
  channel,
  programs,
  timezone,
  cellWidth,
  cellHeight,
  onProgramClick,
  isPremium = false,
  getRecordingStatus,
  onRecordClick
}) => {
  const channelPrograms = programs.filter(p => p.channel_id === channel.id)

  return (
    <View style={styles.container}>
      <View style={[styles.channelInfo, { width: 200, height: cellHeight }]}>
        {channel.logo && (
          <Image
            source={{ uri: channel.logo }}
            alt={channel.name}
            style={styles.channelLogo}
          />
        )}
        <View style={styles.channelDetails}>
          <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
          {channel.requires_subscription === 'premium' && (
            <Text style={styles.premiumBadge}>⭐ Premium</Text>
          )}
        </View>
      </View>

      <ScrollView horizontal style={styles.programsContainer}>
        {channelPrograms.length > 0 ? (
          channelPrograms.map(program => (
            <EPGTimeSlot
              key={program.id}
              program={program}
              timezone={timezone}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
              onClick={onProgramClick}
              recordingStatus={getRecordingStatus?.(program)}
              isPremium={isPremium}
              onRecordClick={onRecordClick}
            />
          ))
        ) : (
          <View style={[styles.noProgramsContainer, { width: cellWidth * 4, height: cellHeight }]}>
            <Text style={styles.noProgramsText}>No programs scheduled</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  channelInfo: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(16px)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  channelLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    borderRadius: 4,
  },
  channelDetails: {
    flex: 1,
    minWidth: 0,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  premiumBadge: {
    fontSize: 12,
    color: '#fbbf24',
  },
  programsContainer: {
    flex: 1,
  },
  noProgramsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noProgramsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
  },
})

export default EPGChannelRow
