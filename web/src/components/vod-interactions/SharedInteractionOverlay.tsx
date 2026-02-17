/**
 * SharedInteractionOverlay
 *
 * Watch-party shared interaction UI. Shows participant avatars with turn indicator,
 * shared conversation log, input gated to current turn, and countdown timer.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native'
import { Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import type { SharedParticipant, SharedExchange, SharedSession } from '../../hooks/useSharedInteraction'
import { SharedParticipantsRow } from './SharedParticipantsRow'

const COUNTDOWN_WARNING_THRESHOLD = parseInt(
  import.meta.env.VITE_SHARED_INTERACTION_TURN_WARNING_SECS || '10',
  10
)
const MAX_VISIBLE_EXCHANGES = 8

interface SharedInteractionOverlayProps {
  session: SharedSession
  participants: SharedParticipant[]
  currentTurnUserId: string | null
  currentUserId: string | null
  isMyTurn: boolean
  turnCountdown: number | null
  conversation: SharedExchange[]
  isSending: boolean
  onSendMessage: (text: string) => void
  onEnd: () => void
}

export function SharedInteractionOverlay({
  session, participants, currentTurnUserId, currentUserId,
  isMyTurn, turnCountdown, conversation, isSending, onSendMessage, onEnd,
}: SharedInteractionOverlayProps) {
  const { t } = useTranslation()
  const [messageText, setMessageText] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null)

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true })
  }, [conversation.length])

  const handleSend = useCallback(() => {
    const text = messageText.trim()
    if (!text || isSending || !isMyTurn) return
    setMessageText('')
    onSendMessage(text)
  }, [messageText, isSending, isMyTurn, onSendMessage])

  const isCountdownUrgent = turnCountdown !== null && turnCountdown <= COUNTDOWN_WARNING_THRESHOLD

  return (
    <div style={webStyles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('player.shared.talkingWith', { name: session.character_name })}
          </Text>
          <Pressable onPress={onEnd} style={styles.closeBtn}>
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <SharedParticipantsRow
          participants={participants}
          currentTurnUserId={currentTurnUserId}
          currentUserId={currentUserId}
        />

        {isMyTurn ? (
          <View style={[styles.turnPrompt, isCountdownUrgent && styles.turnPromptUrgent]}>
            <Text style={[styles.turnPromptText, isCountdownUrgent && styles.turnTextUrgent]}>
              {t('player.shared.yourTurn')}
            </Text>
            {turnCountdown !== null && (
              <Text style={[styles.countdownText, isCountdownUrgent && styles.countdownUrgent]}>
                {turnCountdown}s
              </Text>
            )}
          </View>
        ) : currentTurnUserId ? (
          <Text style={styles.waitingLabel}>
            {t('player.shared.waitingForTurn', {
              name: participants.find((p) => p.user_id === currentTurnUserId)?.user_name ?? '',
            })}
          </Text>
        ) : null}

        <ScrollView ref={scrollRef} style={styles.conversationScroll} showsVerticalScrollIndicator={false}>
          {conversation.slice(-MAX_VISIBLE_EXCHANGES).map((exchange, idx) => {
            const isCharacter = exchange.speaker === 'character'
            const isCurrentUser = exchange.user_id === currentUserId
            const speakerLabel = isCharacter
              ? exchange.character_name ?? session.character_name
              : isCurrentUser ? t('player.shared.you') : exchange.user_name ?? exchange.speaker
            return (
              <View
                key={`shared-${idx}`}
                style={[styles.bubble, isCurrentUser && !isCharacter ? styles.myBubble : isCharacter ? styles.characterBubble : styles.peerBubble]}
              >
                <Text style={styles.bubbleSpeaker}>{speakerLabel}</Text>
                <Text style={[styles.bubbleText, isCharacter && styles.characterBubbleText]}>
                  {exchange.message_text}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, !isMyTurn && styles.inputDisabled]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={isMyTurn ? t('player.shared.typeYourMessage') : t('player.shared.waitForYourTurn')}
            placeholderTextColor={colors.textSecondary}
            editable={isMyTurn && !isSending}
            onKeyPress={(e: { nativeEvent: { key: string } }) => { if (e.nativeEvent.key === 'Enter') handleSend() }}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, (!messageText.trim() || !isMyTurn || isSending) && styles.sendBtnDisabled]}
            disabled={!messageText.trim() || !isMyTurn || isSending}
          >
            <Send size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing[4], gap: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  turnPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: borderRadius.md, backgroundColor: 'rgba(107, 33, 168, 0.25)' },
  turnPromptUrgent: { backgroundColor: 'rgba(220, 38, 38, 0.25)' },
  turnPromptText: { fontSize: 14, fontWeight: '700', color: 'rgba(168, 85, 247, 1)' },
  turnTextUrgent: { color: 'rgba(239, 68, 68, 1)' },
  countdownText: { fontSize: 14, fontWeight: '700', color: 'rgba(168, 85, 247, 1)' },
  countdownUrgent: { color: 'rgba(239, 68, 68, 1)' },
  waitingLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  conversationScroll: { maxHeight: 130 },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: borderRadius.lg, marginBottom: spacing[1] },
  myBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(107, 33, 168, 0.3)' },
  characterBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)' },
  peerBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)' },
  bubbleSpeaker: { fontSize: 10, fontWeight: '700', color: 'rgba(168, 85, 247, 0.8)', marginBottom: 2 },
  bubbleText: { fontSize: 13, color: colors.text },
  characterBubbleText: { color: 'rgba(209, 196, 233, 1)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  textInput: { flex: 1, height: 36, paddingHorizontal: spacing[3], borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.08)', color: colors.text, fontSize: 14 },
  inputDisabled: { opacity: 0.5 },
  sendBtn: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary.DEFAULT, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
})

const webStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    width: 440, maxWidth: 'calc(100vw - 48px)', zIndex: 10006,
    backgroundColor: 'rgba(10, 10, 20, 0.94)', borderRadius: 16,
    border: '1px solid rgba(107, 33, 168, 0.45)', backdropFilter: 'blur(20px)',
  },
}
