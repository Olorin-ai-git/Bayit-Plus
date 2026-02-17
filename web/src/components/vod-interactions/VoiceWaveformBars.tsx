/**
 * VoiceWaveformBars
 *
 * Renders a row of animated frequency bars representing live mic audio levels.
 * Levels are normalised 0-1 values from an AnalyserNode frequency array.
 */

import { View, StyleSheet } from 'react-native'

interface VoiceWaveformBarsProps {
  levels: number[]
  isActive: boolean
}

export function VoiceWaveformBars({ levels, isActive }: VoiceWaveformBarsProps) {
  return (
    <View style={styles.row}>
      {levels.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: Math.max(4, level * 32) },
            isActive && styles.barActive,
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
  },
  barActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
  },
})
