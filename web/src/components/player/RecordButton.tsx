/**
 * RecordButton Component
 * Button to start/stop recording live streams
 */

import React, { useState, useEffect, useRef } from 'react'
import { Text, Pressable } from 'react-native'
import { Circle, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { recordingApi, RecordingSession } from '../../services/recordingApi'
import { useAuthStore } from '../../store/authStore'
import { useModal } from '../../contexts/ModalContext'

interface RecordButtonProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  onShowUpgrade: () => void
  onRecordingStateChange?: (isRecording: boolean, duration: number) => void
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  channelId,
  isLive,
  isPremium,
  onShowUpgrade,
  onRecordingStateChange
}) => {
  const { t } = useTranslation()
  const { showError, showSuccess, showConfirm } = useModal()
  const [isRecording, setIsRecording] = useState(false)
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [duration, setDuration] = useState(0)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
    }
  }, [])

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording, duration)
  }, [isRecording, duration, onRecordingStateChange])

  const checkActiveSession = async () => {
    try {
      const activeSessions = await recordingApi.getActiveRecordings()
      const activeSession = activeSessions.find(s => s.channel_id === channelId)

      if (activeSession) {
        setSession(activeSession)
        setIsRecording(true)

        // Calculate duration from started_at
        const startedAt = new Date(activeSession.started_at).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)
        setDuration(elapsedSeconds)

        // Start duration timer
        startDurationTimer()
      }
    } catch (err) {
      console.error('Failed to check active session:', err)
    }
  }

  const startDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }

    durationInterval.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)
  }

  const handlePress = async () => {
    if (!isPremium) {
      onShowUpgrade()
      return
    }

    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }

  const startRecording = async () => {
    try {
      const newSession = await recordingApi.startRecording({
        channel_id: channelId,
        subtitle_enabled: true,
        subtitle_target_language: 'en'
      })

      setSession(newSession)
      setIsRecording(true)
      setDuration(0)
      startDurationTimer()

      console.log('✅ Recording started:', newSession.recording_id)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      const errorMessage = err?.detail || err?.message || t('recordings.startFailed')
      showError(errorMessage, t('recordings.error'))
    }
  }

  const stopRecording = async () => {
    if (!session) return

    try {
      const recording = await recordingApi.stopRecording(session.id)

      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }

      setIsRecording(false)
      setSession(null)
      setDuration(0)

      console.log('✅ Recording stopped:', recording.id)

      // Show success notification
      showSuccess(
        t('recordings.savedSuccess', {
          duration: formatDuration(recording.duration_seconds)
        }),
        t('recordings.recordingSaved')
      )
    } catch (err: any) {
      console.error('Failed to stop recording:', err)
      const errorMessage = err?.detail || err?.message || t('recordings.stopFailed')
      showError(errorMessage, t('recordings.error'))
    }
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Don't render if not live
  if (!isLive) return null

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center gap-2 px-4 py-2 rounded-full backdrop-blur-[40px] ${
        isRecording ? 'bg-red-500/90' : 'bg-white/10'
      }`}
    >
      {isRecording ? (
        <>
          <Square size={16} color="white" fill="white" />
          <Text className="text-white text-sm font-medium">
            {formatDuration(duration)}
          </Text>
        </>
      ) : (
        <>
          <Circle size={16} color="white" />
          <Text className="text-white text-sm font-medium">{t('recordings.record')}</Text>
        </>
      )}
    </Pressable>
  )
}
