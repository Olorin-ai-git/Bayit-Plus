import React, { useMemo } from 'react'
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
  // Create a channel map for quick lookup
  const channelMap = useMemo(() => {
    return channels.reduce((map, channel) => {
      map[channel.id] = channel
      return map
    }, {} as Record<string, Channel>)
  }, [channels])

  // Sort programs by start time
  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })
  }, [programs])

  // Show empty state if no programs
  if (sortedPrograms.length === 0) {
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">No Programs Found</h3>
          <p className="text-white/60 max-w-md">
            No programs are available for the selected time range. Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
}

export default EPGList
