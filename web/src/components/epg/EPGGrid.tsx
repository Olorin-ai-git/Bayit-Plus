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
  // Show empty state if no channels
  if (channels.length === 0) {
    return (
      <div className="bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary"
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
          </div>
          <h3 className="text-xl font-semibold text-white">No TV Guide Data Available</h3>
          <p className="text-white/60 max-w-md">
            The TV programming schedule is currently unavailable. Please check back later or contact support if this persists.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-black/20 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
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
      </div>
    </div>
  )
}

export default EPGGrid
