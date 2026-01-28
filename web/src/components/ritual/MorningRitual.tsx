import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { Sun, Calendar, Flame, Radio, Film } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ritualService } from '../../services/api'
import logger from '@/utils/logger'
import { GlassView, GlassButton } from '@bayit/shared/ui'
import { colors } from '@olorin/design-tokens'

interface PlaylistItem {
  id: string
  title: string
  type: 'live' | 'vod' | 'radio'
  category?: string
  thumbnail?: string
  stream_url?: string
}

interface RitualData {
  playlist?: PlaylistItem[]
  local_time?: string
}

interface AIBrief {
  greeting: string
  israel_update: string
  recommendation: string
  israel_context?: {
    israel_time: string
    day_name_he: string
    is_shabbat: boolean
  }
}

interface MorningRitualProps {
  onComplete?: () => void
  onSkip?: () => void
}

/**
 * Get content type label with icon
 */
function getContentTypeLabel(type: string, t: any): React.ReactNode {
  const iconProps = { size: 12, style: { marginRight: 4 } };
  switch (type) {
    case 'live':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Flame {...iconProps} color="#ef4444" />
          <Text className="text-[11px] text-gray-500">{t('ritual.typeLive')}</Text>
        </View>
      );
    case 'radio':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Radio {...iconProps} color={colors.primary.DEFAULT} />
          <Text className="text-[11px] text-gray-500">{t('ritual.typeRadio')}</Text>
        </View>
      );
    default:
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Film {...iconProps} color={colors.primary.DEFAULT} />
          <Text className="text-[11px] text-gray-500">{t('ritual.typeVideo')}</Text>
        </View>
      );
  }
}

/**
 * MorningRitual Component
 * Full-screen morning ritual experience with auto-play content.
 * Shows AI brief, Israel context, and curated morning playlist.
 */
export default function MorningRitual({ onComplete, onSkip }: MorningRitualProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [ritualData, setRitualData] = useState<RitualData | null>(null)
  const [aiBrief, setAIBrief] = useState<AIBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBrief, setShowBrief] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const fetchRitualData = async () => {
      try {
        const [checkResult, briefResult] = await Promise.all([
          ritualService.check(),
          ritualService.getAIBrief(),
        ])

        setRitualData(checkResult)
        setAIBrief(briefResult)

        // Auto-hide brief after 5 seconds
        setTimeout(() => {
          setShowBrief(false)
          if (checkResult.playlist?.length > 0) {
            setIsPlaying(true)
          }
        }, 5000)
      } catch (err) {
        logger.error('Failed to fetch ritual data', 'MorningRitual', err)
        onSkip?.()
      } finally {
        setLoading(false)
      }
    }

    fetchRitualData()
  }, [onSkip])

  const handleSkip = async () => {
    try {
      await ritualService.skipToday()
    } catch (err) {
      logger.error('Failed to skip ritual', 'MorningRitual', err)
    }
    onSkip?.()
  }

  const handleComplete = () => {
    onComplete?.()
    navigate('/')
  }

  const handleNextItem = () => {
    if (!ritualData?.playlist) return

    if (currentIndex < ritualData.playlist.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePreviousItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const currentItem = ritualData?.playlist?.[currentIndex]

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0f]">
        <View className="flex-1 items-center justify-center gap-4">
          <Sun size={64} color={colors.primary.DEFAULT} className="mb-4" />
          <ActivityIndicator size="large" color="#A855F7" />
          <Text className="text-lg text-white mt-4">{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#0a0a0f]">
      {/* Background gradient */}
      <View className="absolute top-0 left-0 right-0 bottom-0">
        <View className="flex-1 bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1a] to-[#1a0a20]" />
      </View>

      {/* AI Brief Overlay */}
      {showBrief && aiBrief && (
        <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center bg-black/80 z-[100]">
          <GlassView className="max-w-[500px] p-8 items-center" intensity="high">
            <Sun size={64} color={colors.primary.DEFAULT} className="mb-4" />
            <Text className="text-[28px] font-bold text-white text-center mb-4">{t('ritual.greeting')}</Text>
            <Text className="text-base text-gray-400 text-center mb-2">{t('ritual.israelUpdate')}</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">{t('ritual.recommendation')}</Text>

            <View className="flex-row gap-6 mb-8">
              <View className="items-center gap-1">
                <Text className="text-2xl">🇮🇱</Text>
                <Text className="text-xs text-gray-500">{t('ritual.israelTime')}</Text>
                <Text className="text-base font-semibold text-white">{aiBrief.israel_context?.israel_time}</Text>
              </View>
              <View className="items-center gap-1">
                <Calendar size={28} color={colors.primary.DEFAULT} />
                <Text className="text-xs text-gray-500">{t('ritual.day')}</Text>
                <Text className="text-base font-semibold text-white">{aiBrief.israel_context?.day_name_he}</Text>
              </View>
              {aiBrief.israel_context?.is_shabbat && (
                <View className="items-center gap-1 bg-amber-500/10 px-4 py-2 rounded-xl">
                  <Flame size={28} color="#f59e0b" />
                  <Text className="text-base font-semibold text-amber-500">{t('clock.shabbatShalom')}</Text>
                </View>
              )}
            </View>

            <GlassButton
              onPress={() => setShowBrief(false)}
              className="px-8 py-4"
            >
              <Text className="text-lg font-semibold text-white">{t('ritual.letsStart')}</Text>
            </GlassButton>
          </GlassView>
        </View>
      )}

      {/* Main Content Area */}
      {!showBrief && (
        <View className="flex-1 p-6">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <Sun size={28} color={colors.primary.DEFAULT} />
                <Text className="text-2xl font-bold text-white">{t('ritual.title')}</Text>
              </View>
              <Text className="text-sm text-gray-500">{ritualData?.local_time}</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleSkip}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <Text className="text-sm text-gray-400">{t('ritual.skipToday')}</Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                className="px-4 py-2 rounded-xl bg-purple-600 border border-purple-600 hover:bg-purple-700"
              >
                <Text className="text-sm font-semibold text-white">{t('ritual.finish')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Player Area */}
          <View className="flex-1 mb-6">
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View className="flex-1 rounded-2xl overflow-hidden bg-black/50">
                <video
                  ref={videoRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                  onEnded={handleNextItem}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                />
                <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/70">
                  <Text className="text-lg font-semibold text-white">{currentItem.title}</Text>
                  <Text className="text-xs text-purple-500 mt-1">{currentItem.category}</Text>
                </View>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <View className="flex-1 items-center justify-center p-8">
                <View className="relative w-[200px] h-[200px] mb-6">
                  {currentItem.thumbnail && (
                    <Image
                      source={{ uri: currentItem.thumbnail }}
                      className="w-full h-full rounded-full"
                      resizeMode="cover"
                    />
                  )}
                  <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
                    <View className="absolute w-full h-full rounded-full border-2 border-purple-500 opacity-30 scale-[1.2]" />
                    <View className="absolute w-full h-full rounded-full border-2 border-purple-500 opacity-20 scale-[1.4]" />
                    <View className="absolute w-full h-full rounded-full border-2 border-purple-500 opacity-10 scale-[1.6]" />
                  </View>
                </View>
                <Text className="text-2xl font-bold text-white text-center">{currentItem.title}</Text>
                <audio
                  ref={audioRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                  style={{ width: '100%', marginTop: 16 }}
                />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-base text-gray-500">{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          {/* Playlist */}
          <GlassView className="p-4" intensity="medium">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}
            >
              {ritualData?.playlist?.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => setCurrentIndex(index)}
                  className="flex-row items-center gap-2 p-2 rounded-xl border hover:bg-white/10"
                  style={[index === currentIndex ? styles.playlistItemActive : styles.playlistItemInactive]}
                >
                  {item.thumbnail && (
                    <Image
                      source={{ uri: item.thumbnail }}
                      className="w-12 h-12 rounded-lg"
                      resizeMode="cover"
                    />
                  )}
                  <View className="gap-0.5">
                    <Text className="text-sm font-medium text-white max-w-[120px]" numberOfLines={1}>
                      {item.title}
                    </Text>
                    {getContentTypeLabel(item.type, t)}
                  </View>
                  {index === currentIndex && <View className="w-2 h-2 rounded-full bg-purple-500 ml-2" />}
                </Pressable>
              ))}
            </ScrollView>

            <View className="flex-row items-center justify-center gap-4 mt-4 pt-4 border-t border-white/10">
              <Pressable
                onPress={handlePreviousItem}
                disabled={currentIndex === 0}
                className="w-9 h-9 rounded-full items-center justify-center hover:bg-white/20"
                style={[currentIndex === 0 ? styles.navButtonDisabled : styles.navButtonEnabled]}
              >
                <Text className="text-lg"
                  style={[currentIndex === 0 ? styles.navTextDisabled : styles.navTextEnabled]}>
                  ←
                </Text>
              </Pressable>
              <Text className="text-sm text-gray-400 font-mono">
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>
              <Pressable
                onPress={handleNextItem}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
                className="w-9 h-9 rounded-full items-center justify-center hover:bg-white/20"
                style={[currentIndex >= (ritualData?.playlist?.length || 0) - 1 ? styles.navButtonDisabled : styles.navButtonEnabled]}
              >
                <Text className="text-lg"
                  style={[currentIndex >= (ritualData?.playlist?.length || 0) - 1 ? styles.navTextDisabled : styles.navTextEnabled]}>
                  →
                </Text>
              </Pressable>
            </View>
          </GlassView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  playlistItemActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
  },
  playlistItemInactive: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.3,
  },
  navButtonEnabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navTextDisabled: {
    color: '#6b7280',
  },
  navTextEnabled: {
    color: '#ffffff',
  },
});
