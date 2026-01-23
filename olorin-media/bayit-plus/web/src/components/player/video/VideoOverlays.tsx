/**
 * VideoOverlays - Loading, subtitles, and recording status overlays
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, ActivityIndicator } from 'react-native'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass } from '@/utils/platformClass'
import { RecordingStatusIndicator } from '../RecordingStatusIndicator'
import SubtitleOverlay from '../SubtitleOverlay'
import LiveSubtitleOverlay from '../LiveSubtitleOverlay'

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
})

export type VideoOverlaysProps = z.infer<typeof VideoOverlaysPropsSchema> & {
  currentCues: any[]
  visibleLiveSubtitles: any[]
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

      {/* Loading Spinner */}
      {loading && (
        <View
          className={platformClass(
            'absolute inset-0 bg-black/30 backdrop-blur-sm items-center justify-center',
            'absolute inset-0 bg-black/30 items-center justify-center'
          )}
        >
          <View className="w-12 h-12">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}
    </>
  )
}
