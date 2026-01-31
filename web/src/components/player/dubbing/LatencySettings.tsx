/**
 * Latency Settings Component
 * Advanced settings for buffer size, sync delay, and auto-adaptive sync
 */

import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

interface LatencySettingsProps {
  bufferSize: 1024 | 2048 | 4096
  syncDelayMs: number
  autoAdaptiveSync: boolean
  onBufferSizeChange: (size: 1024 | 2048 | 4096) => void
  onSyncDelayChange: (delta: number) => void
  onAutoAdaptiveToggle: () => void
  onReset: () => void
}

export const LatencySettings: React.FC<LatencySettingsProps> = ({
  bufferSize,
  syncDelayMs,
  autoAdaptiveSync,
  onBufferSizeChange,
  onSyncDelayChange,
  onAutoAdaptiveToggle,
  onReset,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Advanced Settings</Text>

      {/* Buffer Size */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Buffer Size</Text>
        <View style={styles.buttonGroup} accessibilityRole="radiogroup">
          {[1024, 2048, 4096].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.button,
                bufferSize === size && styles.buttonActive,
              ]}
              onPress={() => onBufferSizeChange(size as 1024 | 2048 | 4096)}
              accessibilityRole="radio"
              accessibilityLabel={`Buffer size ${size} samples`}
              accessibilityState={{ checked: bufferSize === size }}
              accessibilityHint={`Set audio buffer to ${size} samples. Lower values reduce latency but may affect stability.`}
            >
              <Text
                style={[
                  styles.buttonText,
                  bufferSize === size && styles.buttonTextActive,
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Auto-Adaptive Sync */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Auto-Adaptive Sync</Text>
        <TouchableOpacity
          style={[
            styles.toggle,
            autoAdaptiveSync && styles.toggleActive,
          ]}
          onPress={onAutoAdaptiveToggle}
          accessibilityRole="switch"
          accessibilityLabel="Auto-Adaptive Sync"
          accessibilityState={{ checked: autoAdaptiveSync }}
          accessibilityHint="Automatically adjusts sync delay based on network latency"
        >
          <View
            style={[
              styles.toggleThumb,
              autoAdaptiveSync && styles.toggleThumbActive,
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Sync Delay Adjustment */}
      <View style={styles.settingRow}>
        <Text
          style={styles.settingLabel}
          accessibilityRole="text"
          accessibilityLabel={`Current sync delay is ${syncDelayMs} milliseconds`}
        >
          Sync Delay: {syncDelayMs > 0 ? '+' : ''}
          {syncDelayMs}ms
        </Text>
        <View style={styles.sliderButtons}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => onSyncDelayChange(-50)}
            accessibilityRole="button"
            accessibilityLabel="Decrease sync delay by 50 milliseconds"
            accessibilityHint="Reduces audio-video synchronization offset"
          >
            <Text style={styles.sliderButtonText}>-50ms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => onSyncDelayChange(-10)}
            accessibilityRole="button"
            accessibilityLabel="Decrease sync delay by 10 milliseconds"
          >
            <Text style={styles.sliderButtonText}>-10ms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => onSyncDelayChange(10)}
            accessibilityRole="button"
            accessibilityLabel="Increase sync delay by 10 milliseconds"
          >
            <Text style={styles.sliderButtonText}>+10ms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => onSyncDelayChange(50)}
            accessibilityRole="button"
            accessibilityLabel="Increase sync delay by 50 milliseconds"
          >
            <Text style={styles.sliderButtonText}>+50ms</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Reset all settings to default values"
        accessibilityHint="Restores buffer size, sync delay, and auto-adaptive sync to defaults"
      >
        <Text style={styles.resetButtonText}>Reset to Defaults</Text>
      </TouchableOpacity>
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
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  buttonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  toggle: {
    width: 50,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  toggleThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#10B981',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  sliderButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  resetButton: {
    marginTop: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
})
