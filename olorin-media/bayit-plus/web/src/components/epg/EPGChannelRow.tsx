import React from 'react'
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
  // Filter programs for this channel
  const channelPrograms = programs.filter(p => p.channel_id === channel.id)

  return (
    <div className="flex border-b border-white/5">
      {/* Channel Info */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 bg-black/30 backdrop-blur-xl border-r border-white/10"
        style={{ width: '200px', height: `${cellHeight}px` }}
      >
        {channel.logo && (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-10 h-10 object-contain rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{channel.name}</h3>
          {channel.requires_subscription === 'premium' && (
            <span className="text-xs text-yellow-400">⭐ Premium</span>
          )}
        </div>
      </div>

      {/* Programs */}
      <div className="flex flex-1 overflow-x-auto scrollbar-thin">
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
          <div
            className="flex items-center justify-center text-white/40 text-sm"
            style={{ width: `${cellWidth * 4}px`, height: `${cellHeight}px` }}
          >
            No programs scheduled
          </div>
        )}
      </div>
    </div>
  )
}

export default EPGChannelRow
