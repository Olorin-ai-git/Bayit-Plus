/**
 * VideoControlButtons - Render functions for control buttons
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { z } from 'zod'
import { WatchPartyButton } from '@/components/watchparty'
import SubtitleControls from '../SubtitleControls'
import LiveSubtitleControls from '../LiveSubtitleControls'
import { RecordButton } from '../RecordButton'

// Zod schema for prop validation
const VideoControlButtonsPropsSchema = z.object({
  isLive: z.boolean(),
  hasUser: z.boolean(),
  hasActiveParty: z.boolean(),
  isPremium: z.boolean(),
  subtitlesEnabled: z.boolean(),
  subtitlesLoading: z.boolean(),
  contentId: z.string().optional(),
  currentSubtitleLang: z.string().optional().nullable(),
  liveSubtitleLang: z.string().optional(),
})

export type VideoControlButtonsProps = z.infer<typeof VideoControlButtonsPropsSchema> & {
  videoElement: HTMLVideoElement | null
  containerRef: React.RefObject<HTMLDivElement>
  availableSubtitles: any[]
  subtitleSettings: any
  onCreatePartyClick: () => void
  onJoinPartyClick: () => void
  onPanelToggle: () => void
  onSubtitleLanguageChange: (lang: string) => void
  onSubtitleToggle: () => void
  onSubtitleSettingsChange: (settings: any) => void
  onSubtitlesRefresh: () => void
  onLiveSubtitleCue: (cue: any) => void
  onLiveSubtitleLangChange: (lang: string) => void
  onShowUpgrade?: () => void
  onRecordingStateChange: (recording: boolean, duration: number) => void
}

export default function VideoControlButtons({
  isLive,
  hasUser,
  contentId,
  hasActiveParty,
  isPremium,
  subtitlesEnabled,
  subtitlesLoading,
  currentSubtitleLang,
  liveSubtitleLang,
  availableSubtitles,
  subtitleSettings,
  videoElement,
  containerRef,
  onCreatePartyClick,
  onJoinPartyClick,
  onPanelToggle,
  onSubtitleLanguageChange,
  onSubtitleToggle,
  onSubtitleSettingsChange,
  onSubtitlesRefresh,
  onLiveSubtitleCue,
  onLiveSubtitleLangChange,
  onShowUpgrade,
  onRecordingStateChange,
}: VideoControlButtonsProps) {
  return {
    renderWatchPartyButton: () =>
      hasUser && contentId ? (
        <WatchPartyButton
          hasActiveParty={hasActiveParty}
          onCreateClick={onCreatePartyClick}
          onJoinClick={onJoinPartyClick}
          onPanelToggle={onPanelToggle}
        />
      ) : null,

    renderSubtitleControls: () =>
      !isLive && contentId ? (
        <SubtitleControls
          contentId={contentId}
          availableLanguages={availableSubtitles}
          currentLanguage={currentSubtitleLang}
          enabled={subtitlesEnabled}
          settings={subtitleSettings}
          onLanguageChange={onSubtitleLanguageChange}
          onToggle={onSubtitleToggle}
          onSettingsChange={onSubtitleSettingsChange}
          onSubtitlesRefresh={onSubtitlesRefresh}
          isLoading={subtitlesLoading}
          containerRef={containerRef}
        />
      ) : null,

    renderLiveSubtitleControls: () =>
      isLive && contentId ? (
        <LiveSubtitleControls
          channelId={contentId}
          isLive={isLive}
          isPremium={isPremium}
          videoElement={videoElement}
          onSubtitleCue={onLiveSubtitleCue}
          onShowUpgrade={onShowUpgrade}
          targetLang={liveSubtitleLang}
          onLanguageChange={onLiveSubtitleLangChange}
        />
      ) : null,

    renderRecordButton: () =>
      isLive && contentId ? (
        <RecordButton
          channelId={contentId}
          isLive={isLive}
          isPremium={isPremium}
          onShowUpgrade={onShowUpgrade}
          onRecordingStateChange={onRecordingStateChange}
        />
      ) : null,
  }
}
