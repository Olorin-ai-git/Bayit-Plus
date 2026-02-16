/**
 * Moment Card
 *
 * Individual moment card in the moments list.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Trash2 } from 'lucide-react'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'
import { InteractiveMoment, useAvatarStudioStore } from '@/stores/avatarStudioStore'

interface MomentCardProps {
  moment: InteractiveMoment
  isSelected: boolean
  onSelect: () => void
}

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MomentCard({ moment, isSelected, onSelect }: MomentCardProps) {
  const { deleteMoment } = useAvatarStudioStore()

  const handleDelete = (e: any) => {
    e.stopPropagation()
    if (confirm('Delete this moment?')) {
      deleteMoment(moment.id)
    }
  }

  return (
    <Pressable onPress={onSelect}>
      <GlassView
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.timestamp}>{formatTimestamp(moment.timestamp)}</Text>
          <GlassButton
            title=""
            onPress={handleDelete}
            variant="ghost"
            size="small"
            icon={<Trash2 size={16} color={colors.error.DEFAULT} />}
          />
        </View>

        <View style={styles.content}>
          {moment.character_frame_url && (
            <img
              src={moment.character_frame_url}
              alt="Character"
              style={styles.thumbnail}
            />
          )}

          <View style={styles.info}>
            <Text style={styles.characterName} numberOfLines={1}>
              {moment.character_name || 'Unnamed Character'}
            </Text>
            <Text style={styles.prompt} numberOfLines={2}>
              {moment.interaction_prompt || 'No prompt set'}
            </Text>
          </View>
        </View>
      </GlassView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.glassPurple,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    fontVariant: ['tabular-nums'],
  },
  content: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    objectFit: 'cover',
    backgroundColor: colors.glassDark,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  characterName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  prompt: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
})
