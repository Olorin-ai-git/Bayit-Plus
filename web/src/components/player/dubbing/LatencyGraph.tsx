/**
 * Latency Graph Component
 * Real-time graph showing latency trend over 60 seconds
 * Platform-specific: SVG on web, simple bars on native
 */

import React, { useMemo } from 'react'
import { StyleSheet, View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { LatencyDataPoint } from '@/stores/dubbingSettingsStore'

interface LatencyGraphProps {
  history: LatencyDataPoint[]
  maxLatency: number
}

export const LatencyGraph: React.FC<LatencyGraphProps> = ({ history, maxLatency }) => {
  const { t } = useTranslation()
  const graphHeight = 80
  const graphWidth = 300

  // Sample data to max 60 points (1 per second)
  const sampledData = useMemo(() => {
    if (history.length <= 60) return history
    const step = Math.ceil(history.length / 60)
    return history.filter((_, i) => i % step === 0)
  }, [history])

  const points = useMemo(() => {
    const step = graphWidth / Math.max(sampledData.length - 1, 1)
    return sampledData
      .map((point, i) => {
        const x = i * step
        const y = graphHeight - (point.totalMs / maxLatency) * graphHeight
        return `${x},${y}`
      })
      .join(' ')
  }, [sampledData, maxLatency])

  // Web: Use SVG for smooth line graph
  if (Platform.OS === 'web') {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dubbing.latency.graph.title')}</Text>
        <View style={styles.graph}>
          {history.length > 0 ? (
            <View style={styles.graphCanvas}>
              <svg width={graphWidth} height={graphHeight}>
                <polyline
                  points={points}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </View>
          ) : (
            <Text style={styles.graphEmptyText}>{t('dubbing.latency.graph.noData')}</Text>
          )}
        </View>
      </View>
    )
  }

  // Native: Use simple bar graph
  const barWidth = graphWidth / Math.max(sampledData.length, 1)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('dubbing.latency.graph.title')}</Text>
      <View style={styles.graph}>
        {history.length > 0 ? (
          <View style={[styles.graphCanvas, styles.nativeGraphContainer]}>
            {sampledData.map((point, i) => {
              const barHeight = (point.totalMs / maxLatency) * graphHeight
              return (
                <View
                  key={i}
                  style={[
                    styles.nativeGraphBar,
                    {
                      width: barWidth - 2,
                      height: barHeight,
                      backgroundColor: '#3B82F6',
                    },
                  ]}
                />
              )
            })}
          </View>
        ) : (
          <Text style={styles.graphEmptyText}>{t('dubbing.latency.graph.noData')}</Text>
        )}
      </View>
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
  graph: {
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphCanvas: {
    width: 300,
    height: 80,
  },
  nativeGraphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  nativeGraphBar: {
    borderRadius: 2,
  },
  graphEmptyText: {
    color: '#FFFFFF',
    opacity: 0.5,
    fontSize: 12,
  },
})
