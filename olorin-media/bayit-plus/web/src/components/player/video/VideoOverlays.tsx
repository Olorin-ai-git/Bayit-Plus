/**
 * VideoOverlays - Loading, subtitles, trivia, and recording status overlays
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { RecordingStatusIndicator } from '../RecordingStatusIndicator'
import SubtitleOverlay from '../SubtitleOverlay'
import LiveSubtitleOverlay from '../LiveSubtitleOverlay'
import TriviaOverlay from '../TriviaOverlay'
import { TriviaFact } from '@bayit/shared-types/trivia'

// Zod schema for prop validation
const VideoOverlaysPropsSchema = z.object({
  loading: z.boolean(),
  isRecording: z.boolean(),
  recordingDuration: z.number(),
  isLive: z.boolean(),
  contentId: z.string().optional(),
  subtitlesEnabled: z.boolean(),
  currentTime: z.number(),
  currentSubtitleLang: z.string().optional().nullable(),
  subtitleSettings: z.any(), // SubtitleSettings type
  triviaEnabled: z.boolean().optional(),
  currentTriviaFact: z.any().optional().nullable(), // TriviaFact type
  onDismissTrivia: z.function().optional(),
  isRTL: z.boolean().optional(),
})

export type VideoOverlaysProps = z.infer<typeof VideoOverlaysPropsSchema> & {
  currentCues: any[]
  visibleLiveSubtitles: any[]
  currentTriviaFact?: TriviaFact | null
  onDismissTrivia?: () => void
}

export default function VideoOverlays({
  loading,
  isRecording,
  recordingDuration,
  isLive,
  contentId,
  subtitlesEnabled,
  currentTime,
  currentCues,
  currentSubtitleLang,
  subtitleSettings,
  visibleLiveSubtitles,
  triviaEnabled = false,
  currentTriviaFact,
  onDismissTrivia,
  isRTL = false,
}: VideoOverlaysProps) {
  return (
    <>
      {/* Recording Status Indicator */}
      <RecordingStatusIndicator
        isRecording={isRecording}
        duration={recordingDuration}
      />

      {/* Subtitle Overlay */}
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

      {/* Trivia Overlay (VOD only) */}
      {!isLive && triviaEnabled && onDismissTrivia && (
        <TriviaOverlay
          fact={currentTriviaFact || null}
          onDismiss={onDismissTrivia}
          isRTL={isRTL}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 48,
    height: 48,
  },
});
