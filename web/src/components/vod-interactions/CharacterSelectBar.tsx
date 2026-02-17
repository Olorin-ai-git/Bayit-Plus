/**
 * CharacterSelectBar
 *
 * Horizontal bar of character avatar circles for free-form dialogue selection.
 * Shows when user clicks "Talk to Character" in player controls.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface ContentCharacter {
  name: string
  voice_id: string
  frame_url: string
  description: string
  movie_context: string
}

interface CharacterSelectBarProps {
  characters: ContentCharacter[]
  onSelect: (character: ContentCharacter) => void
  onClose: () => void
}

export function CharacterSelectBar({
  characters,
  onSelect,
  onClose,
}: CharacterSelectBarProps) {
  const { t } = useTranslation()

  if (characters.length === 0) {
    return (
      <div style={webStyles.container}>
        <View style={styles.bar}>
          <Text style={styles.emptyText}>
            {t('player.dialogue.noCharactersAvailable')}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </div>
    )
  }

  return (
    <div style={webStyles.container}>
      <View style={styles.bar}>
        <Text style={styles.label}>
          {t('player.dialogue.selectCharacter')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.characterList}>
            {characters.map((character) => (
              <Pressable
                key={character.name}
                onPress={() => onSelect(character)}
                style={styles.characterItem}
              >
                <img
                  src={character.frame_url}
                  alt={character.name}
                  style={webStyles.characterImage}
                />
                <Text style={styles.characterName} numberOfLines={1}>
                  {character.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </div>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
  },
  characterList: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  characterItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  characterName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 64,
    textAlign: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
})

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10004,
    backgroundColor: 'rgba(10, 10, 20, 0.92)',
    borderRadius: 12,
    border: '1px solid rgba(107, 33, 168, 0.3)',
    backdropFilter: 'blur(16px)',
    maxWidth: 600,
  },
  characterImage: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(168, 85, 247, 0.5)',
  },
}
