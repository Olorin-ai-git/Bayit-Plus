import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { RecordingStatusIndicator } from './RecordingStatusIndicator'
import SubtitleOverlay from './SubtitleOverlay'
import LiveSubtitleOverlay from './LiveSubtitleOverlay'
import { DubbingOverlay } from './dubbing'
import TriviaOverlay from './TriviaOverlay'
import LiveFeatureUsageIndicator from './LiveFeatureUsageIndicator'
import liveSubtitleService from '@/services/liveSubtitleService'
import { SubtitleCue } from './types'
import { SubtitleSettings } from '@/types/subtitle'
import { UsageStat } from '@/types/quota'
import { TriviaFact } from '@/services/triviaService'

interface VideoPlayerOverlaysProps {
  // Recording
  isRecording: boolean
  recordingDuration: number

  // VOD Subtitles
  isLive: boolean
  contentId?: string
  currentTime: number
  subtitlesEnabled: boolean
  currentSubtitleLang: string | null
  currentCues: SubtitleCue[]
  subtitleSettings: SubtitleSettings

  // Live Subtitles
  visibleLiveSubtitles: SubtitleCue[]

  // Dubbing
  dubbingIsConnected: boolean
  dubbingLastTranscript: string | null
  dubbingLastTranslation: string | null
  dubbingLatencyMs: number | null

  // Trivia
  triviaEnabled: boolean
  currentFact: TriviaFact | null
  onDismissFact: () => void
  isTTSPlaying: boolean

  // Usage stats
  usageStats: UsageStat | null

  // Loading
  loading: boolean
}

export default function VideoPlayerOverlays({
  isRecording,
  recordingDuration,
  isLive,
  contentId,
  currentTime,
  subtitlesEnabled,
  currentSubtitleLang,
  currentCues,
  subtitleSettings,
  visibleLiveSubtitles,
  dubbingIsConnected,
  dubbingLastTranscript,
  dubbingLastTranslation,
  dubbingLatencyMs,
  triviaEnabled,
  currentFact,
  onDismissFact,
  isTTSPlaying,
  usageStats,
  loading,
}: VideoPlayerOverlaysProps) {
  const { t, i18n } = useTranslation()

  return (
    <>
      {/* Recording Status Indicator */}
      <RecordingStatusIndicator
        isRecording={isRecording}
        duration={recordingDuration}
      />

      {/* Subtitle Overlay (VOD) */}
      {!isLive && contentId && (
        <SubtitleOverlay
          currentTime={currentTime}
          subtitles={currentCues}
          language={currentSubtitleLang || 'he'}
          enabled={subtitlesEnabled}
          settings={subtitleSettings}
        />
      )}

      {/* Live Subtitle Overlay (Premium) */}
      {isLive && <LiveSubtitleOverlay cues={visibleLiveSubtitles} />}

      {/* Live Dubbing Overlay (Premium) */}
      {isLive && (
        <DubbingOverlay
          isActive={dubbingIsConnected}
          originalText={dubbingLastTranscript}
          translatedText={dubbingLastTranslation}
          latencyMs={dubbingLatencyMs}
        />
      )}

      {/* Trivia Overlay (VOD only) */}
      {!isLive && triviaEnabled && (
        <TriviaOverlay
          fact={currentFact}
          onDismiss={onDismissFact}
          isRTL={i18n.language === 'he'}
          isTTSPlaying={isTTSPlaying}
        />
      )}

      {/* Live Subtitle Usage Indicator (Premium) */}
      {isLive && usageStats && liveSubtitleService.isServiceConnected() && (
        <LiveFeatureUsageIndicator
          featureType="subtitle"
          usageStats={usageStats}
          isVisible={true}
        />
      )}

      {/* Live Dubbing Usage Indicator (Premium) */}
      {isLive && usageStats && dubbingIsConnected && (
        <LiveFeatureUsageIndicator
          featureType="dubbing"
          usageStats={usageStats}
          isVisible={true}
        />
      )}

      {/* Loading Spinner */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <GlassView style={styles.loadingCard} intensity="high">
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.loadingText}>{t('player.loading', 'Loading...')}</Text>
          </GlassView>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    minWidth: 200,
  },
  spinnerContainer: {
    width: 64,
    height: 64,
    marginBottom: spacing.md,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})
