/**
 * Audiobook Detail Screen (tvOS)
 * Full audiobook metadata with large typography for 10-foot UI
 */

import React, { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useDirection } from '@bayit/shared/hooks'
import { GlassView, GlassButton } from '../components'
import { audiobookService } from '../services/audiobookService'
import { colors } from '../theme'
import logger from '../utils/logger'
import type { Audiobook } from '../types/audiobook'

interface RouteParams {
  id: string
  title?: string
}

export const AudiobookDetailScreenTVOS: React.FC = () => {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const navigation = useNavigation()
  const route = useRoute()
  const { id } = route.params as RouteParams

  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadAudiobook()
  }, [id])

  const loadAudiobook = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await audiobookService.getAudiobookDetail(id)
      setAudiobook(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.failedToLoad')
      logger.error(msg, 'AudiobookDetailScreen', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? '⭐' : '☆')
    }
    return stars.join('')
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center">
        <ActivityIndicator size="large" color={colors.success} />
      </View>
    )
  }

  if (error || !audiobook) {
    return (
      <View className="flex-1 bg-[#0a0a1a] justify-center items-center px-12">
        <GlassView className="p-12 items-center">
          <Text className="text-6xl mb-6">❌</Text>
          <Text className="text-3xl font-bold text-white mb-4" style={{ textAlign }}>
            {t('errors.notFound')}
          </Text>
          <GlassButton variant="primary" onPress={() => navigation.goBack()}>
            {t('common.goBack')}
          </GlassButton>
        </GlassView>
      </View>
    )
  }

  const descriptionPreview = audiobook.description ? audiobook.description.substring(0, 200) : ''
  const hasMoreDescription = audiobook.description && audiobook.description.length > 200

  return (
    <ScrollView className="flex-1 bg-[#0a0a1a]" contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Header with Back Button */}
      <View className="flex-row items-center px-12 pt-8 pb-4">
        <TouchableOpacity
          // @ts-ignore
          hasTVPreferredFocus
          onPress={() => navigation.goBack()}
          className="bg-yellow-500/20 rounded-full w-16 h-16 justify-center items-center"
        >
          <Text className="text-3xl">‹</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View
        className="flex-row px-12 pb-8 gap-8"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        {/* Poster Image */}
        {audiobook.thumbnail && (
          <Image
            source={{ uri: audiobook.thumbnail }}
            className="w-48 aspect-[3/4] rounded-xl"
            resizeMode="cover"
          />
        )}

        {/* Metadata */}
        <View className="flex-1 justify-start">
          {/* Title */}
          <Text className="text-5xl font-bold text-white mb-2" style={{ textAlign }}>
            {audiobook.title}
          </Text>

          {/* Author */}
          {audiobook.author && (
            <Text className="text-3xl text-yellow-400 mb-1" style={{ textAlign }}>
              {audiobook.author}
            </Text>
          )}

          {/* Narrator */}
          {audiobook.narrator && (
            <Text className="text-2xl text-gray-300 mb-4" style={{ textAlign }}>
              {t('audiobooks.narratedBy')} {audiobook.narrator}
            </Text>
          )}

          {/* Rating */}
          {audiobook.avg_rating > 0 && (
            <View className="mb-4">
              <Text className="text-2xl text-white mb-1">{renderStars(audiobook.avg_rating)}</Text>
              <Text className="text-lg text-gray-400">{audiobook.avg_rating.toFixed(1)}/5</Text>
            </View>
          )}

          {/* Specs Grid */}
          <View className="bg-white/10 rounded-lg p-6 mb-6">
            <View className="flex-row justify-between mb-4 gap-6">
              {audiobook.duration && (
                <View>
                  <Text className="text-lg text-gray-400">{t('audiobooks.duration')}</Text>
                  <Text className="text-xl text-white font-semibold">{audiobook.duration}</Text>
                </View>
              )}
              {audiobook.audio_quality && (
                <View>
                  <Text className="text-lg text-gray-400">{t('audiobooks.quality')}</Text>
                  <Text className="text-xl text-white font-semibold">{audiobook.audio_quality}</Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between gap-6">
              {audiobook.isbn && (
                <View>
                  <Text className="text-lg text-gray-400">ISBN</Text>
                  <Text className="text-xl text-white font-semibold">{audiobook.isbn}</Text>
                </View>
              )}
              {audiobook.publisher_name && (
                <View>
                  <Text className="text-lg text-gray-400">{t('audiobooks.publisher')}</Text>
                  <Text className="text-xl text-white font-semibold">{audiobook.publisher_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Description */}
      {audiobook.description && (
        <View className="px-12 mb-8">
          <Text className="text-2xl font-semibold text-white mb-3">{t('common.description')}</Text>
          <GlassView className="p-6">
            <Text className="text-lg text-gray-200 leading-relaxed" style={{ textAlign }}>
              {expanded ? audiobook.description : descriptionPreview}
              {hasMoreDescription && !expanded && '...'}
            </Text>
            {hasMoreDescription && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                className="mt-4 bg-yellow-500/20 px-4 py-2 rounded-lg"
                // @ts-ignore
                hasTVPreferredFocus={!audiobook.thumbnail}
              >
                <Text className="text-yellow-400 font-semibold text-lg">
                  {expanded ? t('common.collapse') : t('common.expandMore')}
                </Text>
              </TouchableOpacity>
            )}
          </GlassView>
        </View>
      )}
    </ScrollView>
  )
}

export default AudiobookDetailScreenTVOS
