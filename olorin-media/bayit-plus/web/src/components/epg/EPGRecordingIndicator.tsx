import React from 'react'
import { View, StyleSheet } from 'react-native'
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

  const sizeStyles = {
    sm: styles.sizeSmall,
    md: styles.sizeMedium,
    lg: styles.sizeLarge,
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  }

  const iconSize = iconSizes[size]
  const sizeStyle = sizeStyles[size]

  return (
    <View style={styles.container}>
      {status === 'scheduled' && (
        <View style={[styles.badge, styles.badgeScheduled, sizeStyle]} title="Scheduled">
          <Clock size={iconSize} color="#ffffff" />
        </View>
      )}

      {status === 'active' && (
        <View style={[styles.badge, styles.badgeActive, sizeStyle]} title="Recording">
          <Circle size={iconSize} color="#ffffff" fill="#ffffff" />
        </View>
      )}

      {status === 'completed' && (
        <View style={[styles.badge, styles.badgeCompleted, sizeStyle]} title="Recorded">
          <CheckCircle size={iconSize} color="#ffffff" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeScheduled: {
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
  },
  badgeActive: {
    backgroundColor: '#ef4444',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  sizeSmall: {
    width: 20,
    height: 20,
  },
  sizeMedium: {
    width: 24,
    height: 24,
  },
  sizeLarge: {
    width: 32,
    height: 32,
  },
})

export default EPGRecordingIndicator
