import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ritualService } from '../../services/api'
import logger from '@/utils/logger'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView, GlassButton } from '@bayit/shared/ui'

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
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <Text style={styles.loaderIcon}>☀️</Text>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* AI Brief Overlay */}
      {showBrief && aiBrief && (
        <View style={styles.briefOverlay}>
          <GlassView style={styles.briefContent} intensity="high">
            <Text style={styles.briefEmoji}>☀️</Text>
            <Text style={styles.briefGreeting}>{t('ritual.greeting')}</Text>
            <Text style={styles.briefIsrael}>{t('ritual.israelUpdate')}</Text>
            <Text style={styles.briefRecommendation}>{t('ritual.recommendation')}</Text>

            <View style={styles.israelContext}>
              <View style={styles.contextItem}>
                <Text style={styles.contextIcon}>🇮🇱</Text>
                <Text style={styles.contextLabel}>{t('ritual.israelTime')}</Text>
                <Text style={styles.contextValue}>{aiBrief.israel_context?.israel_time}</Text>
              </View>
              <View style={styles.contextItem}>
                <Text style={styles.contextIcon}>📅</Text>
                <Text style={styles.contextLabel}>{t('ritual.day')}</Text>
                <Text style={styles.contextValue}>{aiBrief.israel_context?.day_name_he}</Text>
              </View>
              {aiBrief.israel_context?.is_shabbat && (
                <View style={[styles.contextItem, styles.contextShabbat]}>
                  <Text style={styles.contextIcon}>🕯️</Text>
                  <Text style={[styles.contextValue, styles.shabbatText]}>{t('clock.shabbatShalom')}</Text>
                </View>
              )}
            </View>

            <GlassButton
              onPress={() => setShowBrief(false)}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>{t('ritual.letsStart')}</Text>
            </GlassButton>
          </GlassView>
        </View>
      )}

      {/* Main Content Area */}
      {!showBrief && (
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.ritualTitle}>☀️ {t('ritual.title')}</Text>
              <Text style={styles.ritualTime}>{ritualData?.local_time}</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={handleSkip}
                style={({ hovered }) => [
                  styles.headerButton,
                  hovered && styles.headerButtonHovered,
                ]}
              >
                <Text style={styles.headerButtonText}>{t('ritual.skipToday')}</Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                style={({ hovered }) => [
                  styles.headerButton,
                  styles.exitButton,
                  hovered && styles.exitButtonHovered,
                ]}
              >
                <Text style={styles.exitButtonText}>{t('ritual.finish')}</Text>
              </Pressable>
            </View>
          </View>

          {/* Player Area */}
          <View style={styles.playerArea}>
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View style={styles.videoContainer}>
                <video
                  ref={videoRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                  onEnded={handleNextItem}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                />
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{currentItem.title}</Text>
                  <Text style={styles.videoCategory}>{currentItem.category}</Text>
                </View>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <View style={styles.radioContainer}>
                <View style={styles.radioVisual}>
                  {currentItem.thumbnail && (
                    <Image
                      source={{ uri: currentItem.thumbnail }}
                      style={styles.radioThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.radioWaves}>
                    <View style={[styles.wave, styles.wave1]} />
                    <View style={[styles.wave, styles.wave2]} />
                    <View style={[styles.wave, styles.wave3]} />
                  </View>
                </View>
                <Text style={styles.radioTitle}>{currentItem.title}</Text>
                <audio
                  ref={audioRef}
                  src={currentItem.stream_url}
                  autoPlay={isPlaying}
                  controls
                  style={{ width: '100%', marginTop: 16 }}
                />
              </View>
            ) : (
              <View style={styles.noContent}>
                <Text style={styles.noContentText}>{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          {/* Playlist */}
          <GlassView style={styles.playlistBar} intensity="medium">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistItems}
            >
              {ritualData?.playlist?.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => setCurrentIndex(index)}
                  style={({ hovered }) => [
                    styles.playlistItem,
                    index === currentIndex && styles.playlistItemActive,
                    hovered && styles.playlistItemHovered,
                  ]}
                >
                  {item.thumbnail && (
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.playlistThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.playlistItemInfo}>
                    <Text style={styles.playlistItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.playlistItemType}>
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && <View style={styles.playingIndicator} />}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.playlistNav}>
              <Pressable
                onPress={handlePreviousItem}
                disabled={currentIndex === 0}
                style={({ hovered }) => [
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled,
                  hovered && currentIndex !== 0 && styles.navButtonHovered,
                ]}
              >
                <Text style={[
                  styles.navButtonText,
                  currentIndex === 0 && styles.navButtonTextDisabled,
                ]}>
                  ←
                </Text>
              </Pressable>
              <Text style={styles.navCounter}>
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>
              <Pressable
                onPress={handleNextItem}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
                style={({ hovered }) => [
                  styles.navButton,
                  currentIndex >= (ritualData?.playlist?.length || 0) - 1 && styles.navButtonDisabled,
                  hovered && currentIndex < (ritualData?.playlist?.length || 0) - 1 && styles.navButtonHovered,
                ]}
              >
                <Text style={[
                  styles.navButtonText,
                  currentIndex >= (ritualData?.playlist?.length || 0) - 1 && styles.navButtonTextDisabled,
                ]}>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 50%, #1a0a20 100%)' as any,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loaderIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  loaderText: {
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.md,
  },
  briefOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 100,
  },
  briefContent: {
    maxWidth: 500,
    padding: spacing.xl,
    alignItems: 'center',
  },
  briefEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  briefGreeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  briefIsrael: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  briefRecommendation: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  israelContext: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  contextItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  contextShabbat: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contextIcon: {
    fontSize: 24,
  },
  contextLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  shabbatText: {
    color: colors.warning,
  },
  startButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  mainContent: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ritualTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  ritualTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exitButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  exitButtonHovered: {
    backgroundColor: colors.primaryHover,
  },
  exitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  playerArea: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  videoContainer: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  videoCategory: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  radioContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  radioVisual: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: spacing.lg,
  },
  radioThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  radioWaves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
  },
  wave1: {
    transform: [{ scale: 1.2 }],
  },
  wave2: {
    transform: [{ scale: 1.4 }],
    opacity: 0.2,
  },
  wave3: {
    transform: [{ scale: 1.6 }],
    opacity: 0.1,
  },
  radioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  noContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noContentText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  playlistBar: {
    padding: spacing.md,
  },
  playlistItems: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playlistItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  playlistItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playlistThumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  playlistItemInfo: {
    gap: 2,
  },
  playlistItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 120,
  },
  playlistItemType: {
    fontSize: 11,
    color: colors.textMuted,
  },
  playingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  playlistNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
  navCounter: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
})
