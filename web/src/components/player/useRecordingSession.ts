/**
 * useRecordingSession Hook
 * Manages recording session lifecycle (start, stop, duration tracking)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { recordingApi, RecordingSession } from '../../services/recordingApi'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { RecordingOptions } from './RecordOptionsPopover'
import logger from '@/utils/logger'
import { formatDuration } from '@/utils/formatters'

interface UseRecordingSessionProps {
  channelId: string
  onRecordingStateChange?: (isRecording: boolean, duration: number) => void
}

export function useRecordingSession({ channelId, onRecordingStateChange }: UseRecordingSessionProps) {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const [isRecording, setIsRecording] = useState(false)
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [duration, setDuration] = useState(0)
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    subtitleEnabled: true,
    subtitleTargetLanguage: 'en',
    dubbingEnabled: false,
    dubbingTargetLanguage: 'en',
  })
  const durationInterval = useRef<NodeJS.Timeout | null>(null)
  // Use ref for callback to avoid infinite loop when callback changes on every render
  const onRecordingStateChangeRef = useRef(onRecordingStateChange)
  onRecordingStateChangeRef.current = onRecordingStateChange
  // Track if we've had a real state change (skip initial mount with default values)
  const hasStateChanged = useRef(false)

  useEffect(() => {
    return () => {
      if (durationInterval.current) clearInterval(durationInterval.current)
    }
  }, [])

  useEffect(() => {
    // Skip notifying on initial mount with default values (false, 0)
    // Only notify when recording actually starts or stops
    if (!hasStateChanged.current && !isRecording && duration === 0) {
      return
    }
    hasStateChanged.current = true
    onRecordingStateChangeRef.current?.(isRecording, duration)
  }, [isRecording, duration])

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current)
    durationInterval.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const startRecording = useCallback(async (options: RecordingOptions) => {
    try {
      const newSession = await recordingApi.startRecording({
        channel_id: channelId,
        subtitle_enabled: options.subtitleEnabled,
        subtitle_target_language: options.subtitleTargetLanguage,
        dubbing_enabled: options.dubbingEnabled,
        dubbing_target_language: options.dubbingTargetLanguage,
      })
      setSession(newSession)
      setIsRecording(true)
      setDuration(0)
      startDurationTimer()
      logger.debug('Recording started', 'RecordButton', { recordingId: newSession.recording_id })
    } catch (err: any) {
      logger.error('Failed to start recording', 'RecordButton', { error: err })
      notifications.showError(err?.detail || err?.message || t('recordings.startFailed'), t('recordings.error'))
    }
  }, [channelId, startDurationTimer, notifications, t])

  const stopRecording = useCallback(async () => {
    logger.debug('stopRecording called', 'RecordButton', { session, isRecording })
    if (!session) {
      logger.warn('stopRecording called but session is null', 'RecordButton', { isRecording })
      notifications.showError(t('recordings.stopFailed'), t('recordings.error'))
      return
    }
    try {
      logger.debug('Calling API to stop recording', 'RecordButton', { sessionId: session.id })
      const recording = await recordingApi.stopRecording(session.id)
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }
      setIsRecording(false)
      setSession(null)
      setDuration(0)
      logger.debug('Recording stopped', 'RecordButton', { recordingId: recording.id })
      notifications.showSuccess(
        t('recordings.savedSuccess', { duration: formatDuration(recording.duration_seconds) }),
        t('recordings.recordingSaved')
      )
    } catch (err: any) {
      logger.error('Failed to stop recording', 'RecordButton', { error: err })
      notifications.showError(err?.detail || err?.message || t('recordings.stopFailed'), t('recordings.error'))
    }
  }, [session, isRecording, notifications, t])

  return {
    isRecording, session, duration, recordingOptions,
    setRecordingOptions, startRecording, stopRecording, formatDuration,
  }
}
