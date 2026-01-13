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

      {sortedPrograms.length === 0 && (
        <div className="flex items-center justify-center py-20 text-white/40">
          <div className="text-center">
            <p className="text-lg mb-2">No programs found</p>
            <p className="text-sm">Try adjusting your filters or time range</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EPGList
