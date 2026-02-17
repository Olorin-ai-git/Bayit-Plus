/**
 * VoiceInteractionInput
 *
 * Push-to-talk voice input with waveform visualization and text fallback.
 * Uses Web Audio API for live level bars and MediaRecorder for capture.
 * Falls back to VoiceFallbackInput if mic access is denied.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Mic, MicOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import { VoiceWaveformBars } from './VoiceWaveformBars'
import { VoiceFallbackInput } from './VoiceFallbackInput'

const log = logger.scope('VoiceInteractionInput')

const WAVEFORM_BAR_COUNT = 12
const ANALYSER_FFT_SIZE = 256

interface VoiceInteractionInputProps {
  onSendAudio: (data: ArrayBuffer) => void
  onFallbackText: (text: string) => void
  isProcessing: boolean
  processingStage: string | null
}

export function VoiceInteractionInput({
  onSendAudio, onFallbackText, isProcessing, processingStage,
}: VoiceInteractionInputProps) {
  const { t } = useTranslation()
  const [micDenied, setMicDenied] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [waveformLevels, setWaveformLevels] = useState<number[]>(Array(WAVEFORM_BAR_COUNT).fill(0))

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setWaveformLevels(Array(WAVEFORM_BAR_COUNT).fill(0))
  }, [])

  const startWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(dataArray)
      const step = Math.floor(dataArray.length / WAVEFORM_BAR_COUNT)
      const levels = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
        const slice = dataArray.slice(i * step, (i + 1) * step)
        return slice.reduce((s, v) => s + v, 0) / slice.length / 255
      })
      setWaveformLevels(levels)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopWaveform()
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    setIsRecording(false)
  }, [stopWaveform])

  const startRecording = useCallback(async () => {
    if (isProcessing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioCtx = new AudioContext()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = ANALYSER_FFT_SIZE
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = audioCtx
      analyserRef.current = analyser
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onSendAudio(await blob.arrayBuffer())
        audioContextRef.current?.close().catch(() => undefined)
        audioContextRef.current = null
        analyserRef.current = null
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      startWaveform()
    } catch (err) {
      log.error('Mic access denied or unavailable', err)
      setMicDenied(true)
    }
  }, [isProcessing, onSendAudio, startWaveform])

  useEffect(() => {
    return () => {
      stopWaveform()
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      audioContextRef.current?.close().catch(() => undefined)
    }
  }, [stopWaveform])

  if (micDenied) {
    return <VoiceFallbackInput onSend={onFallbackText} isDisabled={isProcessing} />
  }

  const processingLabel = processingStage
    ? t(`player.voice.stage.${processingStage}`, { defaultValue: processingStage })
    : t('player.voice.processing')

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <Text style={styles.stageLabelText}>{processingLabel}</Text>
      ) : (
        <VoiceWaveformBars levels={waveformLevels} isActive={isRecording} />
      )}
      <Pressable
        onPressIn={() => startRecording()}
        onPressOut={() => stopRecording()}
        style={[styles.micBtn, isRecording && styles.micBtnActive, isProcessing && styles.disabled]}
        disabled={isProcessing}
      >
        {isRecording ? <MicOff size={20} color={colors.text} /> : <Mic size={20} color={colors.text} />}
      </Pressable>
      {isRecording && (
        <Text style={styles.recordingHint}>{t('player.voice.holdToRecord')}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  micBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(107, 33, 168, 0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  micBtnActive: { backgroundColor: 'rgba(220, 38, 38, 0.7)', borderColor: 'rgba(239, 68, 68, 0.8)' },
  disabled: { opacity: 0.4 },
  stageLabelText: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  recordingHint: { fontSize: 11, color: colors.textSecondary },
})
