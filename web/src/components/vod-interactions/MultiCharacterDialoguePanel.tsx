/**
 * MultiCharacterDialoguePanel
 *
 * Shows a row of addressable characters (max 3), a conversation log with
 * character-attributed bubbles, reaction lines, and a message send input.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import type { MultiCharacter, CharacterExchange } from '../../hooks/useMultiCharacterInteraction'

const MAX_VISIBLE_CHARACTERS = 3
const MAX_VISIBLE_EXCHANGES = 8

interface MultiCharacterDialoguePanelProps {
  characters: MultiCharacter[]
  addressedCharacter: MultiCharacter | null
  onSelectCharacter: (character: MultiCharacter) => void
  exchanges: CharacterExchange[]
  onSendMessage: (text: string) => void
  isSending: boolean
}

export function MultiCharacterDialoguePanel({
  characters,
  addressedCharacter,
  onSelectCharacter,
  exchanges,
  onSendMessage,
  isSending,
}: MultiCharacterDialoguePanelProps) {
  const { t } = useTranslation()
  const [messageText, setMessageText] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null)

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true })
  }, [exchanges.length])

  const handleSend = useCallback(() => {
    const text = messageText.trim()
    if (!text || isSending) return
    setMessageText('')
    onSendMessage(text)
  }, [messageText, isSending, onSendMessage])

  return (
    <div style={webStyles.container}>
      <View style={styles.panel}>
        <View style={styles.charactersRow}>
          {characters.slice(0, MAX_VISIBLE_CHARACTERS).map((char) => {
            const isActive = addressedCharacter?.name === char.name
            return (
              <Pressable key={char.name} onPress={() => onSelectCharacter(char)} style={styles.charCircleWrap}>
                <img
                  src={char.frame_url}
                  alt={char.name}
                  style={{ ...webStyles.charImage, boxShadow: isActive ? '0 0 0 2px rgba(168, 85, 247, 0.9)' : 'none' }}
                />
                <Text style={[styles.charNameLabel, isActive && styles.charNameActive]} numberOfLines={1}>
                  {char.name}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {addressedCharacter && (
          <Text style={styles.addressingLabel}>
            {t('player.multiChar.addressing', { name: addressedCharacter.name })}
          </Text>
        )}

        <ScrollView ref={scrollRef} style={styles.conversationScroll} showsVerticalScrollIndicator={false}>
          {exchanges.slice(-MAX_VISIBLE_EXCHANGES).map((exchange, idx) => {
            const isUser = exchange.speaker === 'user'
            const speakerLabel = isUser
              ? t('player.dialogue.you')
              : exchange.character_name ?? exchange.speaker

            if (exchange.is_reaction) {
              return (
                <View key={`reaction-${idx}`} style={styles.reactionRow}>
                  <Text style={styles.reactionText}>
                    <Text style={styles.reactionSpeaker}>{speakerLabel}: </Text>
                    {exchange.message_text}
                  </Text>
                </View>
              )
            }

            return (
              <View key={`exchange-${idx}`} style={[styles.bubble, isUser ? styles.userBubble : styles.charBubble]}>
                {!isUser && <Text style={styles.bubbleSpeaker}>{speakerLabel}</Text>}
                <Text style={[styles.bubbleText, !isUser && styles.charBubbleText]}>
                  {exchange.message_text}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('player.multiChar.typeQuestion')}
            placeholderTextColor={colors.textSecondary}
            editable={!isSending && !!addressedCharacter}
            onKeyPress={(e: { nativeEvent: { key: string } }) => { if (e.nativeEvent.key === 'Enter') handleSend() }}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, (!messageText.trim() || isSending || !addressedCharacter) && styles.sendBtnDisabled]}
            disabled={!messageText.trim() || isSending || !addressedCharacter}
          >
            <Send size={16} color={colors.text} />
          </Pressable>
        </View>

        {isSending && <Text style={styles.sendingLabel}>{t('player.dialogue.sending')}</Text>}
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  panel: { padding: spacing[4], gap: spacing[3] },
  charactersRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[5] },
  charCircleWrap: { alignItems: 'center', gap: spacing[1] },
  charNameLabel: { fontSize: 11, color: colors.textSecondary, maxWidth: 64, textAlign: 'center' },
  charNameActive: { color: 'rgba(168, 85, 247, 1)', fontWeight: '700' },
  addressingLabel: { fontSize: 12, color: 'rgba(168, 85, 247, 0.8)', textAlign: 'center', fontStyle: 'italic' },
  conversationScroll: { maxHeight: 140 },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: borderRadius.lg, marginBottom: spacing[1] },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(107, 33, 168, 0.3)' },
  charBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)' },
  bubbleSpeaker: { fontSize: 10, fontWeight: '700', color: 'rgba(168, 85, 247, 0.9)', marginBottom: 2 },
  bubbleText: { fontSize: 13, color: colors.text },
  charBubbleText: { color: 'rgba(209, 196, 233, 1)' },
  reactionRow: { paddingVertical: spacing[1] },
  reactionText: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  reactionSpeaker: { fontWeight: '600', fontStyle: 'normal', color: 'rgba(168, 85, 247, 0.7)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  textInput: { flex: 1, height: 36, paddingHorizontal: spacing[3], borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.08)', color: colors.text, fontSize: 14 },
  sendBtn: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendingLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
})

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', bottom: 80, right: 24, width: 400, zIndex: 10005,
    backgroundColor: 'rgba(10, 10, 20, 0.92)', borderRadius: 16,
    border: '1px solid rgba(107, 33, 168, 0.4)', backdropFilter: 'blur(16px)',
  },
  charImage: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' },
}
