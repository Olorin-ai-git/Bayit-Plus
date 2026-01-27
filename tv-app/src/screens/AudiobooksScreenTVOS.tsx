/**
 * Audiobooks Screen (tvOS)
 * Featured audiobooks organized by sections
 */

import React from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@bayit/shared/hooks'
import { GlassView } from '../components'
import { AudiobookRowTVOS } from '../components/audiobooks/AudiobookRowTVOS'
import { useAudiobooksFeatured } from '../hooks/useAudiobooksFeatured'
import { colors } from '../theme'
import type { Audiobook } from '../types/audiobook'

export const AudiobooksScreenTVOS: React.FC = () => {
  const { t } = useTranslation()
  const { isRTL, textAlign } = useDirection()
  const navigation = useNavigation<any>()
  const { sections, loading, error, retry } = useAudiobooksFeatured()

  const handleAudiobookPress = (audiobook: Audiobook) => {
    navigation.navigate('AudiobookDetail', {
      id: audiobook.id,
      title: audiobook.title,
    })
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center">
        <ActivityIndicator size="large" color={colors.success} />
        <Text className="text-white text-2xl mt-6">{t('common.loading')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center px-12">
        <GlassView className="p-12 items-center">
          <Text className="text-6xl mb-6">🎧</Text>
          <Text className="text-2xl font-semibold text-white mb-3" style={{ textAlign }}>
            {t('errors.loadFailed')}
          </Text>
          <Text className="text-lg text-gray-400 text-center mb-8">{error}</Text>
          <View
            className="bg-yellow-500 px-6 py-3 rounded-lg"
            // @ts-ignore
            hasTVPreferredFocus
            onPress={retry}
          >
            <Text className="text-[#0a0a1a] font-bold text-lg">{t('common.retry')}</Text>
          </View>
        </GlassView>
      </View>
    )
  }

  if (sections.length === 0) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center px-12">
        <GlassView className="p-12 items-center">
          <Text className="text-6xl mb-6">🎧</Text>
          <Text className="text-2xl font-semibold text-white mb-3" style={{ textAlign }}>
            {t('empty.noAudiobooks')}
          </Text>
          <Text className="text-lg text-gray-400 text-center">{t('empty.tryLater')}</Text>
        </GlassView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#0a0a1a]">
      {/* Header */}
      <View className="flex-row items-center px-12 pt-10 pb-8" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View className="w-[70px] h-[70px] rounded-full bg-yellow-500/20 justify-center items-center" style={{ marginLeft: isRTL ? 24 : 0, marginRight: isRTL ? 0 : 24 }}>
          <Text className="text-[36px]">🎧</Text>
        </View>
        <View>
          <Text className="text-5xl font-bold text-white" style={{ textAlign }}>
            {t('audiobooks.title')}
          </Text>
          <Text className="text-xl text-gray-400 mt-1" style={{ textAlign }}>
            {sections.length} {t('audiobooks.sections')}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        scrollEnabled={true}
      >
        {/* Featured Sections */}
        {sections.map((section, idx) => (
          <AudiobookRowTVOS
            key={section.section_id}
            title={section.section_name}
            audiobooks={section.audiobooks}
            onSelectAudiobook={handleAudiobookPress}
          />
        ))}
      </ScrollView>
    </View>
  )
}

export default AudiobooksScreenTVOS
