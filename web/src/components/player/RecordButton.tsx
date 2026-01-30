/**
 * RecordButton Component
 * Button to start/stop recording live streams
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Circle, Square, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens'
import { recordingApi, RecordingSession } from '../../services/recordingApi'
import { useAuthStore } from '../../store/authStore'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { RecordOptionsPopover, RecordingOptions } from './RecordOptionsPopover'
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
  const notifications = useNotifications()
  const [isRecording, setIsRecording] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [duration, setDuration] = useState(0)
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    subtitleEnabled: true,
    subtitleTargetLanguage: 'en',
    dubbingEnabled: false,
    dubbingTargetLanguage: 'en',
  })
  const durationInterval = useRef<NodeJS.Timeout | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

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
      await startRecordingWithOptions(recordingOptions)
    }
  }

  const handleLongPressIn = useCallback(() => {
    if (isRecording) return
    longPressTimer.current = setTimeout(() => {
      if (isPremium) {
        setShowOptions(true)
      }
    }, 500)
  }, [isRecording, isPremium])

  const handleLongPressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleContextMenu = useCallback((e: any) => {
    if (!isPremium || isRecording) return
    e.preventDefault?.()
    setShowOptions(true)
  }, [isPremium, isRecording])

  const handleStartWithOptions = async (options: RecordingOptions) => {
    setRecordingOptions(options)
    await startRecordingWithOptions(options)
  }

  const startRecordingWithOptions = async (options: RecordingOptions) => {
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
      const errorMessage = err?.detail || err?.message || t('recordings.startFailed')
      notifications.showError(errorMessage, t('recordings.error'))
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

      notifications.showSuccess(
        t('recordings.savedSuccess', {
          duration: formatDuration(recording.duration_seconds)
        }),
        t('recordings.recordingSaved')
      )
    } catch (err: any) {
      logger.error('Failed to stop recording', 'RecordButton', { error: err })
      const errorMessage = err?.detail || err?.message || t('recordings.stopFailed')
      notifications.showError(errorMessage, t('recordings.error'))
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
    <View style={styles.wrapper}>
      <RecordOptionsPopover
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        options={recordingOptions}
        onOptionsChange={setRecordingOptions}
        onStartRecording={handleStartWithOptions}
      />

      <View style={[styles.buttonGroup, { flexDirection: 'row' }]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handleLongPressIn}
          onPressOut={handleLongPressOut}
          onContextMenu={handleContextMenu}
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

        {!isRecording && isPremium && (
          <Pressable
            onPress={() => setShowOptions(!showOptions)}
            style={[
              styles.optionsToggle,
              isHovered && styles.buttonHovered,
            ]}
          >
            <ChevronUp size={14} color="white" />
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 200,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: 40,
    shadowColor: 'rgba(139, 92, 246, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    shadowColor: 'rgba(239, 68, 68, 1)',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonIdle: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    borderColor: 'rgba(139, 92, 246, 0.7)',
    transform: [{ scale: 1.03 }],
  },
  buttonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  optionsToggle: {
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: 40,
  },
})
