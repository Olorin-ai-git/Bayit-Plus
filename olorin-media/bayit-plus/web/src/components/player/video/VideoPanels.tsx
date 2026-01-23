/**
 * VideoPanels - Chapters and Settings panels
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { z } from 'zod'
import ChaptersPanel from '../ChaptersPanel'
import SettingsPanel from '../SettingsPanel'
import type { Chapter, QualityOption } from '../types'

// Zod schema for prop validation
const VideoPanelsPropsSchema = z.object({
  isLive: z.boolean(),
  showChaptersPanel: z.boolean(),
  showSettings: z.boolean(),
  hasChapters: z.boolean(),
  currentTime: z.number(),
  duration: z.number(),
  chaptersLoading: z.boolean(),
  currentPlaybackSpeed: z.number(),
  currentQuality: z.string().optional(),
  liveSubtitleLang: z.string().optional(),
})

export type VideoPanelsProps = z.infer<typeof VideoPanelsPropsSchema> & {
  videoRef: React.RefObject<HTMLVideoElement>
  chapters: Chapter[]
  availableSubtitleLanguages: string[]
  availableQualities?: QualityOption[]
  onCloseChapters: () => void
  onCloseSettings: () => void
  onSeekToTime: (time: number) => void
  onLiveSubtitleLangChange: (lang: string) => void
  onQualityChange?: (quality: string) => Promise<void>
  onPlaybackSpeedChange: (speed: number) => void
}

export default function VideoPanels({
  isLive,
  showChaptersPanel,
  showSettings,
  hasChapters,
  chapters,
  currentTime,
  duration,
  chaptersLoading,
  videoRef,
  availableSubtitleLanguages,
  liveSubtitleLang,
  availableQualities,
  currentQuality,
  currentPlaybackSpeed,
  onCloseChapters,
  onCloseSettings,
  onSeekToTime,
  onLiveSubtitleLangChange,
  onQualityChange,
  onPlaybackSpeedChange,
}: VideoPanelsProps) {
  return (
    <>
      {/* Chapters Panel */}
      {!isLive && hasChapters && (
        <ChaptersPanel
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          isLoading={chaptersLoading}
          isOpen={showChaptersPanel}
          onClose={onCloseChapters}
          onSeek={onSeekToTime}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        isLive={isLive}
        videoRef={videoRef}
        availableSubtitleLanguages={availableSubtitleLanguages}
        liveSubtitleLang={liveSubtitleLang}
        availableQualities={availableQualities}
        currentQuality={currentQuality}
        currentPlaybackSpeed={currentPlaybackSpeed}
        onClose={onCloseSettings}
        onLiveSubtitleLangChange={onLiveSubtitleLangChange}
        onQualityChange={onQualityChange}
        onPlaybackSpeedChange={onPlaybackSpeedChange}
      />
    </>
  )
}
