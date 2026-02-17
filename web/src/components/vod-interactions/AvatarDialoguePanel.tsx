/**
 * AvatarDialoguePanel
 *
 * Compact floating panel for free-form character dialogue during VOD playback.
 * Supports text and voice input modes. Positioning controlled by avatarPlacement.
 * Ducks video volume on mount, restores on unmount.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { X, Send, Mic, AlignLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'
import { DialogueConversationList } from './DialogueConversationList'
import type { DialogueExchange } from './DialogueConversationList'
import { VoiceInteractionInput } from './VoiceInteractionInput'

const log = logger.scope('AvatarDialoguePanel')

type InputMode = 'text' | 'voice'
type AvatarPlacement = 'bottom-right' | 'bottom-left' | 'bottom-center'

interface ContentCharacter {
  name: string
  voice_id: string
  frame_url: string
  description: string
  movie_context: string
}

export interface AvatarDialoguePanelProps {
  character: ContentCharacter
  avatarImageUrl: string
  exchanges: DialogueExchange[]
  isSending: boolean
  videoElement: HTMLVideoElement | null
  onSendMessage: (text: string) => Promise<void>
  onSendAudio?: (data: ArrayBuffer) => void
  onClose: () => void
  voiceEnabled?: boolean
  avatarPlacement?: AvatarPlacement
  isVoiceProcessing?: boolean
  voiceProcessingStage?: string | null
}

const PLACEMENT_STYLES: Record<AvatarPlacement, React.CSSProperties> = {
  'bottom-right': { bottom: 80, right: 24 },
  'bottom-left': { bottom: 80, left: 24 },
  'bottom-center': { bottom: 80, left: '50%', transform: 'translateX(-50%)' },
}

export function AvatarDialoguePanel({
  character, avatarImageUrl, exchanges, isSending, videoElement,
  onSendMessage, onSendAudio, onClose,
  voiceEnabled = false, avatarPlacement = 'bottom-right',
  isVoiceProcessing = false, voiceProcessingStage = null,
}: AvatarDialoguePanelProps) {
  const { t } = useTranslation()
  const [messageText, setMessageText] = useState('')
  const [characterVideoUrl, setCharacterVideoUrl] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const characterVideoRef = useRef<HTMLVideoElement>(null)
  const savedVolumeRef = useRef<number>(1)

  useEffect(() => {
    if (videoElement) {
      savedVolumeRef.current = videoElement.volume
      videoElement.volume = 0.15
    }
    return () => { if (videoElement) videoElement.volume = savedVolumeRef.current }
  }, [videoElement])

  useEffect(() => {
    const last = exchanges[exchanges.length - 1]
    if (last?.speaker === 'character' && last.animated_video_url) {
      setCharacterVideoUrl(last.animated_video_url)
    }
  }, [exchanges])

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return
    const text = messageText.trim()
    setMessageText('')
    setCharacterVideoUrl(null)
    try { await onSendMessage(text) }
    catch (err) { log.error('Failed to send message', err) }
  }, [messageText, isSending, onSendMessage])

  const handleSendAudio = useCallback((data: ArrayBuffer) => {
    setCharacterVideoUrl(null)
    onSendAudio?.(data)
  }, [onSendAudio])

  const handleVoiceFallback = useCallback(async (text: string) => {
    setCharacterVideoUrl(null)
    try { await onSendMessage(text) }
    catch (err) { log.error('Voice fallback send failed', err) }
  }, [onSendMessage])

  const isProcessingAny = isSending || isVoiceProcessing

  return (
    <div style={{ ...webStyles.container, ...PLACEMENT_STYLES[avatarPlacement] }}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.characterName}>{character.name}</Text>
          <View style={styles.headerActions}>
            {voiceEnabled && (
              <Pressable onPress={() => setInputMode((m) => m === 'text' ? 'voice' : 'text')} style={styles.iconBtn}>
                {inputMode === 'voice'
                  ? <AlignLeft size={16} color={colors.textSecondary} />
                  : <Mic size={16} color={colors.textSecondary} />
                }
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.circlesRow}>
          <View style={styles.circleContainer}>
            <img src={avatarImageUrl} alt="Avatar" style={webStyles.circleMedia} />
          </View>
          <View style={styles.circleContainer}>
            {characterVideoUrl ? (
              <video ref={characterVideoRef} src={characterVideoUrl} autoPlay
                style={webStyles.circleMedia} onEnded={() => setCharacterVideoUrl(null)} />
            ) : (
              <img src={character.frame_url} alt={character.name} style={webStyles.circleMedia} />
            )}
          </View>
        </View>

        <DialogueConversationList exchanges={exchanges} />

        {inputMode === 'voice' && voiceEnabled ? (
          <VoiceInteractionInput
            onSendAudio={handleSendAudio}
            onFallbackText={handleVoiceFallback}
            isProcessing={isProcessingAny}
            processingStage={voiceProcessingStage}
          />
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t('player.dialogue.typeQuestion')}
              placeholderTextColor={colors.textSecondary}
              editable={!isProcessingAny}
              onKeyPress={(e: { nativeEvent: { key: string } }) => { if (e.nativeEvent.key === 'Enter') handleSend() }}
            />
            <Pressable
              onPress={handleSend}
              style={[styles.sendBtn, (!messageText.trim() || isProcessingAny) && styles.sendBtnDisabled]}
              disabled={!messageText.trim() || isProcessingAny}
            >
              <Send size={16} color={colors.text} />
            </Pressable>
          </View>
        )}

        {isProcessingAny && (
          <Text style={styles.sendingLabel}>{t('player.dialogue.sending')}</Text>
        )}
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  panel: { padding: spacing[4], gap: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  characterName: { fontSize: 16, fontWeight: '700', color: colors.text },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  circlesRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[6] },
  circleContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  textInput: { flex: 1, height: 36, paddingHorizontal: spacing[3], borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.08)', color: colors.text, fontSize: 14 },
  sendBtn: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendingLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
})

const webStyles: Record<string, React.CSSProperties> = {
  container: { position: 'absolute', width: 380, zIndex: 10005, backgroundColor: 'rgba(10, 10, 20, 0.92)', borderRadius: 16, border: '1px solid rgba(107, 33, 168, 0.4)', backdropFilter: 'blur(16px)' },
  circleMedia: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
}
