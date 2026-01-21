import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

declare const __TV__: boolean
const IS_TV = typeof __TV__ !== 'undefined' && __TV__

interface ChatSuggestionsPanelProps {
  onSuggestionPress?: (suggestion: string) => void
}

export function ChatSuggestionsPanel({
  onSuggestionPress,
}: ChatSuggestionsPanelProps) {
  const { t } = useTranslation()

  const suggestedQuestions = [
    t('chatbot.suggestions.whatToWatch'),
    t('chatbot.suggestions.israeliMovies'),
    t('chatbot.suggestions.whatsOnNow'),
    t('chatbot.suggestions.popularPodcasts'),
  ]

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {suggestedQuestions.map((question, index) => (
          <Pressable
            key={index}
            onPress={() => onSuggestionPress?.(question)}
            style={({ hovered }) => [
              styles.button,
              hovered && styles.buttonHovered,
            ]}
          >
            <Text style={styles.text}>{question}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.primary,
  },
  text: {
    fontSize: IS_TV ? 18 : 12,
    color: colors.textSecondary,
  },
})
