/**
 * useVoiceInteractionWS
 *
 * WebSocket hook for real-time voice-based VOD character interaction.
 * Handles auth handshake, audio streaming, and character response events.
 * Single reconnect attempt on unexpected close.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuthStore } from '@bayit/shared-stores/authStore'
import logger from '@/utils/logger'
import { buildVoiceWsUrl } from './voiceInteractionWSUrl'

const log = logger.scope('useVoiceInteractionWS')

const WS_RECONNECT_DELAY_MS = parseInt(import.meta.env.VITE_WS_RECONNECT_DELAY || '3000', 10)

type ProcessingStage = 'transcribing' | 'thinking' | 'generating' | null

export interface VoiceResult {
  transcript: string
  response_text: string
  audio_url?: string
  animated_video_url?: string
}

interface UseVoiceInteractionWSResult {
  isConnected: boolean
  isRecording: boolean
  isProcessing: boolean
  processingStage: ProcessingStage
  lastTranscript: string
  connect: (sessionId: string) => void
  disconnect: () => void
  sendAudioData: (data: ArrayBuffer) => void
  sendTextFallback: (text: string) => void
  endSession: () => void
  onVoiceResult: (handler: (result: VoiceResult) => void) => void
  onError: (handler: (message: string) => void) => void
}

export function useVoiceInteractionWS(): UseVoiceInteractionWSResult {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null)
  const [lastTranscript, setLastTranscript] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const hasReconnectedRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceResultHandlerRef = useRef<((result: VoiceResult) => void) | null>(null)
  const errorHandlerRef = useRef<((message: string) => void) | null>(null)

  const onVoiceResult = useCallback((handler: (result: VoiceResult) => void) => {
    voiceResultHandlerRef.current = handler
  }, [])

  const onError = useCallback((handler: (message: string) => void) => {
    errorHandlerRef.current = handler
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(event.data as string)
    } catch {
      log.warn('Received non-JSON message from voice WS')
      return
    }

    const { type } = data
    if (type === 'processing') {
      setIsProcessing(true)
      setProcessingStage((data.stage as ProcessingStage) ?? null)
    } else if (type === 'voice_result' || type === 'text_result') {
      setIsProcessing(false)
      setProcessingStage(null)
      setIsRecording(false)
      const result = data as unknown as VoiceResult
      if (result.transcript) setLastTranscript(result.transcript)
      voiceResultHandlerRef.current?.(result)
    } else if (type === 'error') {
      setIsProcessing(false)
      setProcessingStage(null)
      setIsRecording(false)
      log.error('Voice WS server error', data.message)
      errorHandlerRef.current?.(String(data.message ?? 'Unknown error'))
    } else if (type === 'session_ended') {
      setIsRecording(false)
      setIsProcessing(false)
      setProcessingStage(null)
    }
  }, [])

  const openConnection = useCallback((sessionId: string) => {
    const token = useAuthStore.getState().token
    const url = buildVoiceWsUrl(sessionId)
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'authenticate', token: token ?? '' }))
      setIsConnected(true)
      hasReconnectedRef.current = false
      log.info('Voice WS connected', { sessionId })
    }

    ws.onmessage = handleMessage

    ws.onerror = () => {
      log.error('Voice WS connection error', { sessionId })
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      setIsRecording(false)
      setIsProcessing(false)
      setProcessingStage(null)
      if (!event.wasClean && !hasReconnectedRef.current && sessionIdRef.current) {
        hasReconnectedRef.current = true
        reconnectTimerRef.current = setTimeout(() => {
          if (sessionIdRef.current) openConnection(sessionIdRef.current)
        }, WS_RECONNECT_DELAY_MS)
      }
    }

    wsRef.current = ws
  }, [handleMessage])

  const connect = useCallback((sessionId: string) => {
    wsRef.current?.close()
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    hasReconnectedRef.current = false
    sessionIdRef.current = sessionId
    openConnection(sessionId)
  }, [openConnection])

  const disconnect = useCallback(() => {
    sessionIdRef.current = null
    hasReconnectedRef.current = true
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    wsRef.current?.close(1000, 'client disconnect')
    wsRef.current = null
    setIsConnected(false)
    setIsRecording(false)
    setIsProcessing(false)
    setProcessingStage(null)
  }, [])

  const sendAudioData = useCallback((data: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log.warn('Cannot send audio: WS not connected')
      return
    }
    setIsRecording(true)
    wsRef.current.send(data)
  }, [])

  const sendTextFallback = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log.warn('Cannot send text fallback: WS not connected')
      return
    }
    setIsProcessing(true)
    setProcessingStage('thinking')
    wsRef.current.send(JSON.stringify({ type: 'text_input', text }))
  }, [])

  const endSession = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'end_session' }))
  }, [])

  useEffect(() => {
    return () => {
      sessionIdRef.current = null
      hasReconnectedRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close(1000, 'unmount')
    }
  }, [])

  return {
    isConnected, isRecording, isProcessing, processingStage, lastTranscript,
    connect, disconnect, sendAudioData, sendTextFallback, endSession,
    onVoiceResult, onError,
  }
}
