/**
 * SharedParticipantsRow
 *
 * Row of participant circles for shared interaction overlay.
 * Active participant glows; current user name is highlighted.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing } from '@olorin/design-tokens'
import type { SharedParticipant } from '../../hooks/useSharedInteraction'

interface SharedParticipantsRowProps {
  participants: SharedParticipant[]
  currentTurnUserId: string | null
  currentUserId: string | null
}

export function SharedParticipantsRow({
  participants,
  currentTurnUserId,
  currentUserId,
}: SharedParticipantsRowProps) {
  const { t } = useTranslation()

  return (
    <View style={styles.row}>
      {participants.map((participant) => {
        const isActive = participant.user_id === currentTurnUserId
        const isMe = participant.user_id === currentUserId
        return (
          <View key={participant.user_id} style={styles.item}>
            <View style={[styles.circle, isActive && styles.circleActive]}>
              {participant.avatar_url ? (
                <img
                  src={participant.avatar_url}
                  alt={participant.user_name}
                  style={webStyles.img}
                />
              ) : (
                <Text style={styles.initial}>
                  {participant.user_name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
              {isMe ? t('player.shared.you') : participant.user_name}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[4], justifyContent: 'center' },
  item: { alignItems: 'center', gap: spacing[1] },
  circle: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  circleActive: { borderColor: 'rgba(168, 85, 247, 0.9)' },
  initial: { fontSize: 16, fontWeight: '700', color: colors.text },
  name: { fontSize: 10, color: colors.textSecondary, maxWidth: 52, textAlign: 'center' },
  nameMe: { color: 'rgba(168, 85, 247, 0.9)' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(168, 85, 247, 0.9)' },
})

const webStyles: Record<string, React.CSSProperties> = {
  img: { width: '100%', height: '100%', objectFit: 'cover' },
}
