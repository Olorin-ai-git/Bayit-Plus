import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { RecordingStatusIndicator } from './RecordingStatusIndicator'
import SubtitleOverlay from './SubtitleOverlay'
import LiveSubtitleOverlay from './LiveSubtitleOverlay'
import LiveSplitSubtitleOverlay from './subtitle/LiveSplitSubtitleOverlay'
import { DubbingOverlay } from './dubbing'
import TriviaOverlay from './TriviaOverlay'
import LiveFeatureUsageIndicator from './LiveFeatureUsageIndicator'
import liveSubtitleService from '@/services/liveSubtitleService'
import liveSplitSubtitleService from '@/services/liveSplitSubtitleService'
import { SubtitleCue } from './types'
import { SubtitleSettings, SplitLanguages, LiveSubtitleCue } from '@/types/subtitle'
import { UsageStat } from '@/types/quota'
import { TriviaFact } from '../../../../shared/types/trivia'

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

  // Split Mode Subtitles
  splitMode?: boolean
  splitLanguages?: SplitLanguages | null
  splitCues?: {
    primary: SubtitleCue[]
    secondary: SubtitleCue[]
  }

  // Live Subtitles
  visibleLiveSubtitles: SubtitleCue[]

  // Live Split Subtitles
  liveSplitMode?: boolean
  liveSplitLanguages?: SplitLanguages | null
  liveSplitPrimaryCues?: LiveSubtitleCue[]
  liveSplitSecondaryCues?: LiveSubtitleCue[]

  // Dubbing
  dubbingIsConnected: boolean
  dubbingLastTranscript: string | null
  dubbingLastTranslation: string | null
  dubbingLatencyMs: number | null

  // Trivia
  triviaEnabled: boolean
  currentFact: TriviaFact | null
  onDismissFact: () => void
  onTriviaHoverStart?: () => void
  onTriviaHoverEnd?: () => void
  isTTSPlaying: boolean

  // Usage stats
  usageStats: UsageStat | null

  // Loading
  loading: boolean

  // Error state
  error?: string | null

  // Widget mode
  isWidget?: boolean
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
  splitMode = false,
  splitLanguages = null,
  splitCues = { primary: [], secondary: [] },
  visibleLiveSubtitles,
  liveSplitMode = false,
  liveSplitLanguages = null,
  liveSplitPrimaryCues = [],
  liveSplitSecondaryCues = [],
  dubbingIsConnected,
  dubbingLastTranscript,
  dubbingLastTranslation,
  dubbingLatencyMs,
  triviaEnabled,
  currentFact,
  onDismissFact,
  onTriviaHoverStart,
  onTriviaHoverEnd,
  isTTSPlaying,
  usageStats,
  loading,
  error = null,
  isWidget = false,
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
          splitMode={splitMode}
          splitLanguages={splitLanguages}
          splitCues={splitCues}
        />
      )}

      {/* Live Subtitle Overlay (Premium) - Hidden in widget mode */}
      {isLive && !isWidget && !liveSplitMode && (
        <LiveSubtitleOverlay cues={visibleLiveSubtitles} />
      )}

      {/* Live Split Subtitle Overlay (Premium) - Hidden in widget mode */}
      {isLive && !isWidget && liveSplitMode && liveSplitLanguages && (
        <LiveSplitSubtitleOverlay
          primaryCues={liveSplitPrimaryCues}
          secondaryCues={liveSplitSecondaryCues}
          primaryLanguage={liveSplitLanguages[0]}
          secondaryLanguage={liveSplitLanguages[1]}
          enabled={liveSplitMode}
        />
      )}

      {/* Live Dubbing Overlay (Premium) - Hidden in widget mode */}
      {isLive && !isWidget && (
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
          onHoverStart={onTriviaHoverStart}
          onHoverEnd={onTriviaHoverEnd}
          isRTL={i18n.language === 'he'}
          isTTSPlaying={isTTSPlaying}
        />
      )}

      {/* Live Subtitle Usage Indicator (Premium) - Hidden in widget mode */}
      {isLive && !isWidget && usageStats && (liveSubtitleService.isServiceConnected() || liveSplitSubtitleService.isPartiallyConnected()) && (
        <LiveFeatureUsageIndicator
          featureType="subtitle"
          usageStats={usageStats}
          isVisible={true}
        />
      )}

      {/* Live Dubbing Usage Indicator (Premium) - Hidden in widget mode */}
      {isLive && !isWidget && usageStats && dubbingIsConnected && (
        <LiveFeatureUsageIndicator
          featureType="dubbing"
          usageStats={usageStats}
          isVisible={true}
        />
      )}

      {/* Loading Spinner */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <GlassView style={styles.loadingCard} intensity="high">
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.loadingText}>{t('player.loading', 'Loading...')}</Text>
          </GlassView>
        </View>
      )}

      {/* Error Overlay */}
      {error && (
        <View style={styles.loadingOverlay}>
          <GlassView style={styles.errorCard} intensity="high">
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>{t('player.error.title', 'Stream Unavailable')}</Text>
            <Text style={styles.errorText}>{error}</Text>
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
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    minWidth: 280,
    maxWidth: 400,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.error,
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
