/**
 * Latency Breakdown Chart Component
 * Visualizes latency components as horizontal bar chart with percentages
 */

import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import type { LatencyReport } from '@/services/liveDubbingService'

interface LatencyBreakdownChartProps {
  currentLatency: LatencyReport | null
  bufferSize: number
  syncDelayMs: number
  totalLatency: number
}

export const LatencyBreakdownChart: React.FC<LatencyBreakdownChartProps> = ({
  currentLatency,
  bufferSize,
  syncDelayMs,
  totalLatency,
}) => {
  if (!currentLatency) return null

  const bufferMs = (bufferSize / 16000) * 1000

  const breakdown = [
    { label: 'Buffer', value: bufferMs, color: '#8B5CF6' },
    { label: 'STT', value: currentLatency.avg_stt_ms, color: '#3B82F6' },
    { label: 'Translation', value: currentLatency.avg_translation_ms, color: '#10B981' },
    { label: 'TTS', value: currentLatency.avg_tts_ms, color: '#F59E0B' },
    {
      label: 'Network',
      value: currentLatency.avg_network_roundtrip_ms || 40,
      color: '#EC4899',
    },
    { label: 'Sync', value: syncDelayMs, color: '#6366F1' },
  ]

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Latency Breakdown</Text>
      <View style={styles.chart}>
        {breakdown.map((item, index) => (
          <View key={index} style={styles.chartRow}>
            <View style={styles.chartLabel}>
              <View style={[styles.chartDot, { backgroundColor: item.color }]} />
              <Text style={styles.chartText}>{item.label}</Text>
            </View>
            <Text style={styles.chartValue}>{item.value.toFixed(0)}ms</Text>
            <View style={styles.chartBarContainer}>
              <View
                style={[
                  styles.chartBar,
                  {
                    width: `${(item.value / totalLatency) * 100}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Cache Hit Rate */}
      {currentLatency?.translation_cache_hit_rate !== undefined && (
        <View style={styles.cacheInfo}>
          <Text style={styles.cacheText}>
            Cache Hit Rate: {(currentLatency.translation_cache_hit_rate * 100).toFixed(1)}%
          </Text>
          <Text style={styles.cacheSubtext}>
            Provider: {currentLatency.translation_provider || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    gap: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  chartDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  chartValue: {
    color: '#FFFFFF',
    fontSize: 12,
    width: 50,
    textAlign: 'right',
  },
  chartBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 6,
  },
  cacheInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  cacheText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  cacheSubtext: {
    color: '#FFFFFF',
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
})
