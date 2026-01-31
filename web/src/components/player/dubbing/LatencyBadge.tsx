/**
 * Latency Badge Component
 * Collapsible badge showing current total latency with color-coded status
 */

import React, { useMemo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassTooltip } from '@olorin/glass-ui/web'
import { Icon } from '@olorin/shared-icons/web'

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
  const { t } = useTranslation()

  // Color-coded badge based on total latency
  const badgeColor = useMemo(() => {
    if (totalLatency < 300) return '#10B981' // Green
    if (totalLatency < 500) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }, [totalLatency])

  const badgeContent = (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: `${badgeColor}33` }]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${t('dubbing.latency.badge.title')} ${totalLatency.toFixed(0)} ${t('common.milliseconds')}. ${isExpanded ? t('common.collapse') : t('common.expand')} ${t('common.details')}.`}
      accessibilityState={{ expanded: isExpanded }}
      accessibilityHint={t('dubbing.latency.badge.accessibilityHint')}
    >
      <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
      <Text style={styles.badgeText}>{totalLatency.toFixed(0)}ms</Text>
      <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size="xs" color="#FFFFFF" />
    </TouchableOpacity>
  )

  return (
    <GlassTooltip content={t('dubbing.latency.badge.tooltip')} position="bottom">
      {badgeContent}
    </GlassTooltip>
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
