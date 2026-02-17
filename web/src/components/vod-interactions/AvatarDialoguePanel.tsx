/**
 * AvatarDialoguePanel
 *
 * Compact floating panel for free-form character dialogue during VOD playback.
 * Bottom-right positioning, ~380px wide. Shows dual circles (avatar + character),
 * scrollable conversation, input field, and character video playback.
 * Ducks video volume on mount, restores on unmount.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native'
import { X, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import logger from '@/utils/logger'

const log = logger.scope('AvatarDialoguePanel')

interface ContentCharacter {
  name: string
  voice_id: string
  frame_url: string
  description: string
  movie_context: string
}

interface DialogueExchange {
  speaker: 'user' | 'character'
  message_text: string
  audio_url?: string
  animated_video_url?: string
}

interface AvatarDialoguePanelProps {
  character: ContentCharacter
  avatarImageUrl: string
  exchanges: DialogueExchange[]
  isSending: boolean
  videoElement: HTMLVideoElement | null
  onSendMessage: (text: string) => Promise<void>
  onClose: () => void
}

export function AvatarDialoguePanel({
  character,
  avatarImageUrl,
  exchanges,
  isSending,
  videoElement,
  onSendMessage,
  onClose,
}: AvatarDialoguePanelProps) {
  const { t } = useTranslation()
  const [messageText, setMessageText] = useState('')
  const [characterVideoUrl, setCharacterVideoUrl] = useState<string | null>(null)
  const characterVideoRef = useRef<HTMLVideoElement>(null)
  const scrollRef = useRef<ScrollView>(null)
  const savedVolumeRef = useRef<number>(1)

  // Duck volume on mount, restore on unmount
  useEffect(() => {
    if (videoElement) {
      savedVolumeRef.current = videoElement.volume
      videoElement.volume = 0.15
    }
    return () => {
      if (videoElement) {
        videoElement.volume = savedVolumeRef.current
      }
    }
  }, [videoElement])

  // Watch for new character responses with video
  useEffect(() => {
    const lastExchange = exchanges[exchanges.length - 1]
    if (lastExchange?.speaker === 'character' && lastExchange.animated_video_url) {
      setCharacterVideoUrl(lastExchange.animated_video_url)
    }
  }, [exchanges])

  // Auto-scroll conversation
  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true })
  }, [exchanges.length])

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return
    const text = messageText.trim()
    setMessageText('')
    setCharacterVideoUrl(null)
    try {
      await onSendMessage(text)
    } catch (err) {
      log.error('Failed to send message', err)
    }
  }, [messageText, isSending, onSendMessage])

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      if (e.nativeEvent.key === 'Enter') {
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div style={webStyles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.characterName}>{character.name}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Circles */}
        <View style={styles.circlesRow}>
          <View style={styles.circleContainer}>
            <img
              src={avatarImageUrl}
              alt="Avatar"
              style={webStyles.circleImage}
            />
          </View>
          <View style={styles.circleContainer}>
            {characterVideoUrl ? (
              <video
                ref={characterVideoRef}
                src={characterVideoUrl}
                autoPlay
                style={webStyles.circleVideo}
                onEnded={() => setCharacterVideoUrl(null)}
              />
            ) : (
              <img
                src={character.frame_url}
                alt={character.name}
                style={webStyles.circleImage}
              />
            )}
          </View>
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          style={styles.conversationScroll}
          showsVerticalScrollIndicator={false}
        >
          {exchanges.slice(-6).map((exchange, idx) => (
            <View
              key={`${exchange.speaker}-${idx}`}
              style={[
                styles.bubble,
                exchange.speaker === 'user' ? styles.userBubble : styles.characterBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  exchange.speaker === 'character' && styles.characterBubbleText,
                ]}
              >
                {exchange.message_text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('player.dialogue.typeQuestion')}
            placeholderTextColor={colors.textSecondary}
            editable={!isSending}
            onKeyPress={handleKeyPress}
          />
          <Pressable
            onPress={handleSend}
            style={[
              styles.sendBtn,
              (!messageText.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            disabled={!messageText.trim() || isSending}
          >
            <Send size={16} color={colors.text} />
          </Pressable>
        </View>

        {isSending && (
          <Text style={styles.sendingLabel}>
            {t('player.dialogue.sending')}
          </Text>
        )}
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
  },
  circleContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  conversationScroll: {
    maxHeight: 120,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[1],
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  characterBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleText: {
    fontSize: 13,
    color: colors.text,
  },
  characterBubbleText: {
    color: 'rgba(168, 85, 247, 1)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  textInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 380,
    zIndex: 10005,
    backgroundColor: 'rgba(10, 10, 20, 0.92)',
    borderRadius: 16,
    border: '1px solid rgba(107, 33, 168, 0.4)',
    backdropFilter: 'blur(16px)',
  },
  circleImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
  circleVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
}
