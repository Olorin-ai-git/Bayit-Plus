/**
 * Unit tests for dubbing settings store
 */

import { renderHook, act } from '@testing-library/react'
import {
  useDubbingSettingsStore,
  useLatencyHistoryStore,
  useChannelDubbingSettings,
} from '../dubbingSettingsStore'

describe('DubbingSettingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDubbingSettingsStore.getState().resetAllSettings()
    useLatencyHistoryStore.setState({ history: {} })
  })

  describe('Channel Settings', () => {
    it('should return default settings for new channel', () => {
      const { result } = renderHook(() => useChannelDubbingSettings('channel-1'))

      expect(result.current.settings).toEqual({
        bufferSize: 2048,
        syncDelayMs: 250,
        autoAdaptiveSync: true,
        voiceId: null,
        originalVolume: 0.3,
        dubbedVolume: 1.0,
      })
    })

    it('should update channel settings', () => {
      const { result } = renderHook(() => useChannelDubbingSettings('channel-1'))

      act(() => {
        result.current.updateSettings({ bufferSize: 1024, syncDelayMs: 100 })
      })

      expect(result.current.settings.bufferSize).toBe(1024)
      expect(result.current.settings.syncDelayMs).toBe(100)
      expect(result.current.settings.autoAdaptiveSync).toBe(true) // Unchanged
    })

    it('should persist settings across re-renders', () => {
      const { result: result1 } = renderHook(() => useChannelDubbingSettings('channel-1'))

      act(() => {
        result1.current.updateSettings({ voiceId: 'voice-123' })
      })

      // Unmount and remount
      const { result: result2 } = renderHook(() => useChannelDubbingSettings('channel-1'))

      expect(result2.current.settings.voiceId).toBe('voice-123')
    })

    it('should isolate settings per channel', () => {
      const { result: channel1 } = renderHook(() => useChannelDubbingSettings('channel-1'))
      const { result: channel2 } = renderHook(() => useChannelDubbingSettings('channel-2'))

      act(() => {
        channel1.current.updateSettings({ bufferSize: 1024 })
        channel2.current.updateSettings({ bufferSize: 4096 })
      })

      expect(channel1.current.settings.bufferSize).toBe(1024)
      expect(channel2.current.settings.bufferSize).toBe(4096)
    })

    it('should reset channel settings to defaults', () => {
      const { result } = renderHook(() => useChannelDubbingSettings('channel-1'))

      act(() => {
        result.current.updateSettings({ bufferSize: 4096, syncDelayMs: -200 })
      })

      expect(result.current.settings.bufferSize).toBe(4096)

      act(() => {
        result.current.resetSettings()
      })

      expect(result.current.settings.bufferSize).toBe(2048) // Default
      expect(result.current.settings.syncDelayMs).toBe(250) // Default
    })
  })

  describe('Latency History', () => {
    it('should add latency data point', () => {
      const dataPoint = {
        timestamp: Date.now(),
        totalMs: 600,
        sttMs: 150,
        translationMs: 30,
        ttsMs: 300,
        networkMs: 40,
        bufferMs: 128,
        syncMs: 250,
      }

      act(() => {
        useLatencyHistoryStore.getState().addDataPoint('channel-1', dataPoint)
      })

      const history = useLatencyHistoryStore.getState().getHistory('channel-1')
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual(dataPoint)
    })

    it('should maintain 60-second rolling window', () => {
      const now = Date.now()

      // Add old data point (70 seconds ago)
      act(() => {
        useLatencyHistoryStore.getState().addDataPoint('channel-1', {
          timestamp: now - 70000,
          totalMs: 600,
          sttMs: 150,
          translationMs: 30,
          ttsMs: 300,
          networkMs: 40,
          bufferMs: 128,
          syncMs: 250,
        })
      })

      // Add recent data point (10 seconds ago)
      act(() => {
        useLatencyHistoryStore.getState().addDataPoint('channel-1', {
          timestamp: now - 10000,
          totalMs: 650,
          sttMs: 160,
          translationMs: 35,
          ttsMs: 310,
          networkMs: 45,
          bufferMs: 128,
          syncMs: 250,
        })
      })

      const history = useLatencyHistoryStore.getState().getHistory('channel-1')

      // Old data point should be filtered out
      expect(history).toHaveLength(1)
      expect(history[0].totalMs).toBe(650)
    })

    it('should calculate average latency correctly', () => {
      const now = Date.now()

      act(() => {
        useLatencyHistoryStore.getState().addDataPoint('channel-1', {
          timestamp: now,
          totalMs: 600,
          sttMs: 150,
          translationMs: 30,
          ttsMs: 300,
          networkMs: 40,
          bufferMs: 128,
          syncMs: 250,
        })

        useLatencyHistoryStore.getState().addDataPoint('channel-1', {
          timestamp: now,
          totalMs: 700,
          sttMs: 170,
          translationMs: 40,
          ttsMs: 350,
          networkMs: 50,
          bufferMs: 128,
          syncMs: 250,
        })
      })

      const avg = useLatencyHistoryStore.getState().getAverageLatency('channel-1')

      expect(avg).toBeDefined()
      expect(avg!.totalMs).toBe(650) // (600 + 700) / 2
      expect(avg!.sttMs).toBe(160) // (150 + 170) / 2
      expect(avg!.translationMs).toBe(35) // (30 + 40) / 2
    })

    it('should return null for empty history', () => {
      const avg = useLatencyHistoryStore.getState().getAverageLatency('channel-1')
      expect(avg).toBeNull()
    })

    it('should clear history for specific channel', () => {
      const now = Date.now()

      act(() => {
        useLatencyHistoryStore.getState().addDataPoint('channel-1', {
          timestamp: now,
          totalMs: 600,
          sttMs: 150,
          translationMs: 30,
          ttsMs: 300,
          networkMs: 40,
          bufferMs: 128,
          syncMs: 250,
        })

        useLatencyHistoryStore.getState().addDataPoint('channel-2', {
          timestamp: now,
          totalMs: 700,
          sttMs: 170,
          translationMs: 40,
          ttsMs: 350,
          networkMs: 50,
          bufferMs: 128,
          syncMs: 250,
        })
      })

      act(() => {
        useLatencyHistoryStore.getState().clearHistory('channel-1')
      })

      const history1 = useLatencyHistoryStore.getState().getHistory('channel-1')
      const history2 = useLatencyHistoryStore.getState().getHistory('channel-2')

      expect(history1).toHaveLength(0)
      expect(history2).toHaveLength(1)
    })
  })
})
