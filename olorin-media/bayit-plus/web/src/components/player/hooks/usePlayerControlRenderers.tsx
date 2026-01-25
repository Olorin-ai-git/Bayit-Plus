import { useCallback, useMemo } from 'react'
import { WatchPartyButton } from '@/components/watchparty'
import SubtitleControls from '../SubtitleControls'
import LiveSubtitleControls from '../LiveSubtitleControls'
import { DubbingControls } from '../dubbing'
import { RecordButton } from '../RecordButton'
import liveSubtitleService from '@/services/liveSubtitleService'
import { SubtitleTrack, SubtitleSettings } from '@/types/subtitle'
import { UseLiveDubbingState } from './useLiveDubbing'
import { WatchParty } from '@/types/watchparty'
import { SubtitleCue } from '../types'

interface UsePlayerControlRenderersParams {
  // User and content
  user: any
  contentId?: string
  isLive: boolean
  containerRef: React.RefObject<HTMLDivElement>
  videoRef: React.RefObject<HTMLVideoElement>

  // Watch Party
  party: WatchParty | null
  showPartyPanel: boolean
  setShowCreateModal: (show: boolean) => void
  setShowJoinModal: (show: boolean) => void
  setShowPartyPanel: (show: boolean) => void

  // Subtitles (VOD)
  availableSubtitles: SubtitleTrack[]
  currentSubtitleLang: string | null
  subtitlesEnabled: boolean
  subtitleSettings: SubtitleSettings
  subtitlesLoading: boolean
  handleSubtitleLanguageChange: (lang: string) => void
  handleSubtitleToggle: () => void
  handleSubtitleSettingsChange: (settings: SubtitleSettings) => void
  fetchAvailableSubtitles: () => void

  // Live Subtitles
  liveSubtitleLang: string
  setLiveSubtitleLang: (lang: string) => void
  handleLiveSubtitleCue: (cue: SubtitleCue) => void

  // Dubbing
  dubbing: UseLiveDubbingState

  // Recording
  setIsRecording: (recording: boolean) => void
  setRecordingDuration: (duration: number) => void

  // Callbacks
  onShowUpgrade?: () => void
}

export function usePlayerControlRenderers({
  user,
  contentId,
  isLive,
  containerRef,
  videoRef,
  party,
  showPartyPanel,
  setShowCreateModal,
  setShowJoinModal,
  setShowPartyPanel,
  availableSubtitles,
  currentSubtitleLang,
  subtitlesEnabled,
  subtitleSettings,
  subtitlesLoading,
  handleSubtitleLanguageChange,
  handleSubtitleToggle,
  handleSubtitleSettingsChange,
  fetchAvailableSubtitles,
  liveSubtitleLang,
  setLiveSubtitleLang,
  handleLiveSubtitleCue,
  dubbing,
  setIsRecording,
  setRecordingDuration,
  onShowUpgrade,
}: UsePlayerControlRenderersParams) {
  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  const renderWatchPartyButton = useCallback(() =>
    user && contentId ? (
      <WatchPartyButton
        hasActiveParty={!!party}
        onCreateClick={() => setShowCreateModal(true)}
        onJoinClick={() => setShowJoinModal(true)}
        onPanelToggle={() => setShowPartyPanel(!showPartyPanel)}
      />
    ) : null
  , [user, contentId, party, showPartyPanel, setShowCreateModal, setShowJoinModal, setShowPartyPanel])

  const renderSubtitleControls = useCallback(() =>
    !isLive && contentId ? (
      <SubtitleControls
        contentId={contentId}
        availableLanguages={availableSubtitles}
        currentLanguage={currentSubtitleLang}
        enabled={subtitlesEnabled}
        settings={subtitleSettings}
        onLanguageChange={handleSubtitleLanguageChange}
        onToggle={handleSubtitleToggle}
        onSettingsChange={handleSubtitleSettingsChange}
        onSubtitlesRefresh={fetchAvailableSubtitles}
        isLoading={subtitlesLoading}
        containerRef={containerRef}
      />
    ) : null
  , [isLive, contentId, availableSubtitles, currentSubtitleLang, subtitlesEnabled, subtitleSettings,
     handleSubtitleLanguageChange, handleSubtitleToggle, handleSubtitleSettingsChange,
     fetchAvailableSubtitles, subtitlesLoading, containerRef])

  const renderLiveSubtitleControls = useCallback(() =>
    isLive && contentId ? (
      <LiveSubtitleControls
        channelId={contentId}
        isLive={isLive}
        isPremium={isPremium}
        videoElement={videoRef.current}
        onSubtitleCue={handleLiveSubtitleCue}
        onShowUpgrade={onShowUpgrade}
        targetLang={liveSubtitleLang}
        onLanguageChange={setLiveSubtitleLang}
        onDisableDubbing={dubbing.disconnect}
      />
    ) : null
  , [isLive, contentId, isPremium, videoRef, handleLiveSubtitleCue, onShowUpgrade,
     liveSubtitleLang, setLiveSubtitleLang, dubbing.disconnect])

  const renderDubbingControls = useCallback(() =>
    isLive && contentId ? (
      <DubbingControls
        isEnabled={dubbing.isConnected}
        isConnecting={dubbing.isConnecting}
        isAvailable={dubbing.isAvailable}
        isPremium={isPremium}
        targetLanguage={dubbing.targetLanguage}
        availableLanguages={dubbing.availableLanguages}
        latencyMs={dubbing.latencyMs}
        error={dubbing.error}
        onDisableSubtitles={() => liveSubtitleService.disconnect()}
        onToggle={() => {
          // Prevent toggling while connection is in progress
          if (dubbing.isConnecting) {
            return
          }

          if (dubbing.isConnected) {
            dubbing.disconnect()
          } else {
            dubbing.connect()
          }
        }}
        onLanguageChange={dubbing.setTargetLanguage}
        onShowUpgrade={onShowUpgrade}
      />
    ) : null
  , [isLive, contentId, isPremium, dubbing, onShowUpgrade])

  const renderRecordButton = useCallback(() =>
    isLive && contentId ? (
      <RecordButton
        channelId={contentId}
        isLive={isLive}
        isPremium={isPremium}
        onShowUpgrade={onShowUpgrade}
        onRecordingStateChange={(recording, duration) => {
          setIsRecording(recording)
          setRecordingDuration(duration)
        }}
      />
    ) : null
  , [isLive, contentId, isPremium, onShowUpgrade, setIsRecording, setRecordingDuration])

  return useMemo(() => ({
    renderWatchPartyButton,
    renderSubtitleControls,
    renderLiveSubtitleControls,
    renderDubbingControls,
    renderRecordButton,
  }), [
    renderWatchPartyButton,
    renderSubtitleControls,
    renderLiveSubtitleControls,
    renderDubbingControls,
    renderRecordButton,
  ])
}
