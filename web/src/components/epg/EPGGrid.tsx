import React from 'react'
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
  return (
    <div className="flex flex-col bg-black/10 rounded-xl overflow-hidden border border-white/10">
      {/* Timeline Header */}
      <div className="sticky top-0 z-20">
        <EPGTimeline
          startTime={startTime}
          endTime={endTime}
          timezone={timezone}
          intervalMinutes={30}
          cellWidth={cellWidth}
        />
      </div>

      {/* Channel Rows */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
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

        {channels.length === 0 && (
          <div className="flex items-center justify-center py-20 text-white/40">
            <div className="text-center">
              <p className="text-lg mb-2">No channels available</p>
              <p className="text-sm">Check back later for programming</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EPGGrid
