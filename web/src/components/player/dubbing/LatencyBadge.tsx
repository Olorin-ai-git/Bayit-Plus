/**
 * Latency Badge Component
 * Collapsible badge showing current total latency with color-coded status
 */

import React, { useMemo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

interface LatencyBadgeProps {
  totalLatency: number
  isExpanded: boolean
  onToggle: () => void
}

export const LatencyBadge: React.FC<LatencyBadgeProps> = ({
  totalLatency,
  isExpanded,
  onToggle,
}) => {
  // Color-coded badge based on total latency
  const badgeColor = useMemo(() => {
    if (totalLatency < 300) return '#10B981' // Green
    if (totalLatency < 500) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }, [totalLatency])

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: `${badgeColor}33` }]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`Latency ${totalLatency.toFixed(0)} milliseconds. ${isExpanded ? 'Collapse' : 'Expand'} details.`}
      accessibilityState={{ expanded: isExpanded }}
      accessibilityHint="Double tap to toggle latency details panel"
    >
      <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
      <Text style={styles.badgeText}>{totalLatency.toFixed(0)}ms</Text>
      <Text style={styles.badgeArrow}>{isExpanded ? '▼' : '▶'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    minWidth: 44,
    minHeight: 44,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeArrow: {
    color: '#FFFFFF',
    fontSize: 10,
  },
})
