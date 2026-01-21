import React from 'react'
import { Circle, Clock, CheckCircle } from 'lucide-react'

export type RecordingStatus = 'none' | 'scheduled' | 'active' | 'completed'

interface EPGRecordingIndicatorProps {
  status: RecordingStatus
  size?: 'sm' | 'md' | 'lg'
}

const EPGRecordingIndicator: React.FC<EPGRecordingIndicatorProps> = ({
  status,
  size = 'md'
}) => {
  if (status === 'none') return null

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18
  }

  const iconSize = iconSizes[size]

  return (
    <div className="absolute top-2 right-2 z-10">
      {/* Scheduled Recording */}
      {status === 'scheduled' && (
        <div
          className={`${sizeClasses[size]} flex items-center justify-center bg-yellow-500/90 backdrop-blur-sm rounded-full shadow-lg`}
          title="Scheduled"
        >
          <Clock size={iconSize} className="text-white" />
        </div>
      )}

      {/* Active Recording */}
      {status === 'active' && (
        <div
          className={`${sizeClasses[size]} flex items-center justify-center bg-red-500 backdrop-blur-sm rounded-full shadow-lg animate-pulse`}
          title="Recording"
        >
          <Circle size={iconSize} className="text-white" fill="white" />
        </div>
      )}

      {/* Completed Recording */}
      {status === 'completed' && (
        <div
          className={`${sizeClasses[size]} flex items-center justify-center bg-green-500/90 backdrop-blur-sm rounded-full shadow-lg`}
          title="Recorded"
        >
          <CheckCircle size={iconSize} className="text-white" />
        </div>
      )}
    </div>
  )
}

export default EPGRecordingIndicator
