/**
 * Latency Visualization Component
 * Real-time latency monitoring for live dubbing/subtitles with automatic video buffering
 * Read-only visualization - no manual controls (video sync is automatic via server/client buffering)
 */

import React, { useState, useMemo } from 'react'
import { StyleSheet, View, ScrollView, Platform } from 'react-native'
import {
  useChannelDubbingSettings,
  useLatencyHistoryStore,
} from '@/stores/dubbingSettingsStore'
import type { LatencyReport } from '@/services/liveDubbingService'
import { LatencyBadge } from './LatencyBadge'
import { LatencyBreakdownChart } from './LatencyBreakdownChart'
import { LatencyGraph } from './LatencyGraph'

interface LatencyVisualizationProps {
  channelId: string
  currentLatency: LatencyReport | null
  videoDelayMs?: number // Applied video delay from synced stream (server-side or client-side)
}

export const LatencyVisualization: React.FC<LatencyVisualizationProps> = ({
  channelId,
  currentLatency,
  videoDelayMs = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { settings } = useChannelDubbingSettings(channelId)
  const history = useLatencyHistoryStore((state) => state.getHistory(channelId))

  // Calculate total latency (processing + video delay)
  // Video delay is applied automatically via server-side or client-side buffering
  const totalLatency = useMemo(() => {
    if (!currentLatency) return videoDelayMs

    const bufferMs = (settings.bufferSize / 16000) * 1000 // 16kHz sample rate
    // Total = processing latency + buffer latency + applied video delay
    return currentLatency.avg_total_ms + bufferMs + videoDelayMs
  }, [currentLatency, settings.bufferSize, videoDelayMs])

  return (
    <View style={styles.container}>
      {/* Collapsible Badge - Shows total latency */}
      <LatencyBadge
        totalLatency={totalLatency}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {/* Expanded Panel - Read-only visualization */}
      {isExpanded && (
        <View style={styles.panel}>
          <ScrollView style={styles.scrollView}>
            {/* Component Breakdown Chart */}
            <LatencyBreakdownChart
              currentLatency={currentLatency}
              bufferSize={settings.bufferSize}
              syncDelayMs={videoDelayMs}
              totalLatency={totalLatency}
            />

            {/* Real-Time Graph (60-second history) */}
            <LatencyGraph history={history} maxLatency={totalLatency} />
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  panel: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' as any }),
    borderRadius: 16,
    padding: 16,
    maxHeight: 500,
  },
  scrollView: {
    maxHeight: 500,
  },
})
