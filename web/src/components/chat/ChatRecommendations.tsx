import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import type { ContentRecommendation } from './types'

interface ChatRecommendationsProps {
  recommendations: ContentRecommendation[]
  isRTL?: boolean
  onRecommendationPress?: (id: string) => void
}

export function ChatRecommendations({
  recommendations,
  isRTL = false,
  onRecommendationPress,
}: ChatRecommendationsProps) {
  const { t } = useTranslation()

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isRTL && styles.textRTL]}>
        {t('chatbot.recommendations')}
      </Text>
      <View style={styles.grid}>
        {recommendations.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onRecommendationPress?.(item.id)}
            style={styles.card}
          >
            <GlassCard style={styles.cardInner}>
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.image}
                resizeMode="cover"
              />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  textRTL: {
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
  },
  cardInner: {
    padding: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.text,
  },
})
