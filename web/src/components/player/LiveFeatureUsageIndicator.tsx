/**
 * LiveFeatureUsageIndicator Component
 * Displays real-time usage stats for live subtitles and dubbing features
 * Shows usage, limits, rollover balance, and warning states
 */

import { View, Text, StyleSheet } from 'react-native'
import { Clock, AlertCircle } from 'lucide-react'
import { colors, spacing } from '@bayit/shared/theme'

interface UsageStats {
  subtitle_usage_current_hour: number
  subtitle_minutes_per_hour: number
  accumulated_subtitle_minutes: number
  dubbing_usage_current_hour: number
  dubbing_minutes_per_hour: number
  accumulated_dubbing_minutes: number
  estimated_cost_current_month: number
  warning_threshold_percentage: number
}

interface LiveFeatureUsageIndicatorProps {
  featureType: 'subtitle' | 'dubbing'
  usageStats: UsageStats | null
  isVisible: boolean
}

export default function LiveFeatureUsageIndicator({
  featureType,
  usageStats,
  isVisible,
}: LiveFeatureUsageIndicatorProps) {
  if (!isVisible || !usageStats) return null

  const isSubtitle = featureType === 'subtitle'
  const currentUsage = isSubtitle
    ? usageStats.subtitle_usage_current_hour
    : usageStats.dubbing_usage_current_hour
  const limit = isSubtitle
    ? usageStats.subtitle_minutes_per_hour
    : usageStats.dubbing_minutes_per_hour

  const accumulated = isSubtitle
    ? usageStats.accumulated_subtitle_minutes
    : usageStats.accumulated_dubbing_minutes

  // Total available = current period limit + accumulated rollover
  const totalAvailable = limit + accumulated
  const usagePercentage = totalAvailable > 0 ? (currentUsage / totalAvailable) * 100 : 0
  const isWarning = usagePercentage >= 80
  const isNearLimit = usagePercentage >= 95

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          isWarning && styles.badgeWarning,
          isNearLimit && styles.badgeError,
        ]}
      >
        <Clock size={12} color={isNearLimit ? colors.error : colors.textSecondary} />
        <Text
          style={[styles.usageText, isNearLimit && styles.usageTextError]}
        >
          {currentUsage.toFixed(1)} / {totalAvailable.toFixed(0)} min
        </Text>
        {accumulated > 0 && (
          <Text style={styles.rolloverText}>(+{accumulated.toFixed(0)} saved)</Text>
        )}
        {isWarning && (
          <AlertCircle size={12} color={isNearLimit ? colors.error : '#f59e0b'} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 50,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeError: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  usageText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  usageTextError: {
    color: colors.error,
  },
  rolloverText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
})
