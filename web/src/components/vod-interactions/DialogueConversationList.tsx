/**
 * DialogueConversationList
 *
 * Scrollable conversation bubble list extracted from AvatarDialoguePanel.
 * Renders the last N exchanges with user/character bubble styling.
 */

import { useRef, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

const MAX_VISIBLE_EXCHANGES = 6

export interface DialogueExchange {
  speaker: 'user' | 'character'
  message_text: string
  audio_url?: string
  animated_video_url?: string
}

interface DialogueConversationListProps {
  exchanges: DialogueExchange[]
}

export function DialogueConversationList({ exchanges }: DialogueConversationListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null)

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true })
  }, [exchanges.length])

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {exchanges.slice(-MAX_VISIBLE_EXCHANGES).map((exchange, idx) => (
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
  )
}

const styles = StyleSheet.create({
  scroll: {
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
})
