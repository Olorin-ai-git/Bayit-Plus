import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { chatService } from '@/services/api'
import logger from '@/utils/logger'

interface UseChatVoiceOptions {
  onTranscript?: (text: string, language?: string) => void
  onError?: (error: Error) => void
}

export function useChatVoice(options: UseChatVoiceOptions = {}) {
  const { t, i18n } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const transcriptionLanguage = i18n.language || 'he'
      const response = await chatService.transcribeAudio(audioBlob, transcriptionLanguage)
      const transcribedText = response.text

      if (transcribedText) {
        setCurrentTranscript(transcribedText)

        if (response.language) {
          setCurrentLanguage(response.language)
        }

        options.onTranscript?.(transcribedText, response.language)
      }

      return response
    } catch (error) {
      logger.error('Failed to transcribe audio:', 'useChatVoice', error)
      options.onError?.(error as Error)
      throw error
    } finally {
      setIsTranscribing(false)
    }
  }, [i18n.language, options])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      logger.error('Failed to start recording', 'useChatVoice', error)
      options.onError?.(error as Error)
      throw error
    }
  }, [transcribeAudio, options])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const resetTranscript = useCallback(() => {
    setCurrentTranscript('')
    setCurrentLanguage(null)
  }, [])

  return {
    isRecording,
    isTranscribing,
    currentTranscript,
    currentLanguage,
    startRecording,
    stopRecording,
    toggleRecording,
    resetTranscript,
    transcribeAudio,
  }
}
