import { View, Text, Pressable, StyleSheet } from 'react-native'
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
    <View className="px-4 pb-2">
      <View className="flex-row flex-wrap gap-2">
        {suggestedQuestions.map((question, index) => (
          <Pressable
            key={index}
            onPress={() => onSuggestionPress?.(question)}
            className="px-4 py-1 rounded-full bg-white/5 border border-white/10"
            style={({ hovered }) => [hovered && styles.hovered]}
          >
            <Text className="text-gray-400" style={[IS_TV ? styles.textTV : styles.textMobile]}>
              {question}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.primary,
  },
  textTV: {
    fontSize: 18,
  },
  textMobile: {
    fontSize: 12,
  },
})
