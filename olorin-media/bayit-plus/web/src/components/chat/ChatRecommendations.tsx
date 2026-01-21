import { View, Text, Pressable, Image } from 'react-native'
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
    <View className="w-full">
      <Text className={`text-[14px] text-gray-400 mb-2 ${isRTL ? 'text-right' : ''}`}>
        {t('chatbot.recommendations')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {recommendations.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onRecommendationPress?.(item.id)}
            className="w-[48%]"
          >
            <GlassCard className="p-2">
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full aspect-video rounded-md mb-1"
                resizeMode="cover"
              />
              <Text className="text-[14px] text-white" numberOfLines={1}>
                {item.title}
              </Text>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
