/**
 * RecordButton Component
 * Button to start/stop recording live streams
 */

import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Circle, Square } from 'lucide-react-native'
import { recordingApi, RecordingSession } from '../../services/recordingApi'
import { useAuthStore } from '../../store/authStore'

interface RecordButtonProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  onShowUpgrade: () => void
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  channelId,
  isLive,
  isPremium,
  onShowUpgrade
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [session, setSession] = useState<RecordingSession | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  // Check for existing active session on mount
  useEffect(() => {
    if (isLive && isPremium && channelId) {
      checkActiveSession()
    }
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
    }
  }, [channelId, isLive, isPremium])

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
      setError(null)

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
      setError(err?.detail || 'Failed to start recording')

      // Show error notification (could integrate with toast/notification system)
      alert(err?.detail || 'Failed to start recording. Please try again.')
    }
  }

  const stopRecording = async () => {
    if (!session) return

    try {
      setError(null)

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
      alert(`Recording saved! View in My Recordings\n\nDuration: ${formatDuration(recording.duration_seconds)}`)
    } catch (err: any) {
      console.error('Failed to stop recording:', err)
      setError(err?.detail || 'Failed to stop recording')

      alert(err?.detail || 'Failed to stop recording. Please try again.')
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
      style={[
        styles.button,
        isRecording ? styles.buttonRecording : styles.buttonIdle
      ]}
    >
      {isRecording ? (
        <>
          <Square size={16} color="white" fill="white" />
          <Text style={styles.buttonText}>
            {formatDuration(duration)}
          </Text>
        </>
      ) : (
        <>
          <Circle size={16} color="white" />
          <Text style={styles.buttonText}>Record</Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backdropFilter: 'blur(40px)',
  },
  buttonIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)', // red-500
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  }
})
