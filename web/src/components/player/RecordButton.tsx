/**
 * RecordButton Component
 * Button to start/stop recording live streams
 */

import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Circle, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'
import { recordingApi, RecordingSession } from '../../services/recordingApi'
import { useAuthStore } from '../../store/authStore'
import { useModal } from '../../contexts/ModalContext'
import logger from '@/utils/logger'

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
  const [isHovered, setIsHovered] = useState(false)
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [duration, setDuration] = useState(0)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
    }
  }, [])

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

        const startedAt = new Date(activeSession.started_at).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)
        setDuration(elapsedSeconds)

        startDurationTimer()
      }
    } catch (err) {
      logger.error('Failed to check active session', 'RecordButton', { error: err })
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

      logger.debug('Recording started', 'RecordButton', { recordingId: newSession.recording_id })
    } catch (err: any) {
      logger.error('Failed to start recording', 'RecordButton', { error: err })
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

      logger.debug('Recording stopped', 'RecordButton', { recordingId: recording.id })

      showSuccess(
        t('recordings.savedSuccess', {
          duration: formatDuration(recording.duration_seconds)
        }),
        t('recordings.recordingSaved')
      )
    } catch (err: any) {
      logger.error('Failed to stop recording', 'RecordButton', { error: err })
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

  if (!isLive) return null

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        isRecording ? styles.buttonRecording : styles.buttonIdle,
        isHovered && !isRecording && styles.buttonHovered,
      ]}
    >
      {isRecording ? (
        <>
          <Square size={16} color="white" fill="white" />
          <Text style={styles.buttonText}>{formatDuration(duration)}</Text>
        </>
      ) : (
        <>
          <Circle size={16} color="white" />
          <Text style={styles.buttonText}>{t('recordings.record')}</Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  buttonIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
})
