import { useState, useRef, useCallback } from 'react'
import { chatService } from '@/services/api'

/**
 * useVoiceRecording hook
 * Provides voice recording and transcription functionality using Web Audio API
 * Supports Hebrew (Hebronics) transcription
 */
export function useVoiceRecording(options = {}) {
  const {
    onTranscribed,
    onError,
    autoTranscribe = true,
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [error, setError] = useState(null)
  const [hasPermission, setHasPermission] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

  // Check if browser supports MediaRecorder
  const isSupported = typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      return true
    } catch (err) {
      setHasPermission(false)
      setError('noMicrophone')
      onError?.('noMicrophone')
      return false
    }
  }, [onError])

  // Transcribe audio blob
  const transcribeAudio = useCallback(async (audioBlob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      const response = await chatService.transcribeAudio(audioBlob)
      const text = response.text || ''

      setTranscribedText(text)
      onTranscribed?.(text)

      return text
    } catch (err) {
      console.error('Transcription failed:', err)
      setError('transcribeError')
      onError?.('transcribeError')
      return ''
    } finally {
      setIsTranscribing(false)
    }
  }, [onTranscribed, onError])

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return

    setError(null)
    setTranscribedText('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null

        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        // Auto-transcribe if enabled
        if (autoTranscribe && audioBlob.size > 0) {
          await transcribeAudio(audioBlob)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setHasPermission(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('recordingError')
      setHasPermission(false)
      onError?.('recordingError')
    }
  }, [isRecording, autoTranscribe, transcribeAudio, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  // Toggle recording (for single button use)
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // Cancel recording without transcribing
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear chunks before stopping
      audioChunksRef.current = []
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [isRecording])

  // Clear transcribed text
  const clearTranscription = useCallback(() => {
    setTranscribedText('')
  }, [])

  return {
    // State
    isRecording,
    isTranscribing,
    transcribedText,
    error,
    hasPermission,
    isSupported,

    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    cancelRecording,
    requestPermission,
    clearTranscription,
    transcribeAudio,
  }
}

export default useVoiceRecording
