import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { WatchPartyButton } from '@/components/watchparty'
import SubtitleControls from '../SubtitleControls'
import LiveSubtitleControls from '../LiveSubtitleControls'
import { DubbingControls } from '../dubbing'
import { RecordButton } from '../RecordButton'
import CastButton from '../controls/CastButton'
import CatchUpButton from '../catchup/CatchUpButton'
import LiveFeatureButton from '../controls/LiveFeatureButton'
import { MessageCircle, Lightbulb } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import liveSubtitleService from '@/services/liveSubtitleService'
import { SubtitleTrack, SubtitleSettings, HebrewMode, EnglishMode } from '@/types/subtitle'
import { UseLiveDubbingState } from './useLiveDubbing'
import { WatchParty } from '@/types/watchparty'
import { SubtitleCue } from '../types'
import { CastSession } from '../types/cast'
import { UsageStats } from '@/services/liveQuotaApi'

interface UsePlayerControlRenderersParams {
  // User and content
  user: any
  contentId?: string
  usageStats?: UsageStats | null
  isAdmin?: boolean
  isLive: boolean
  containerRef: React.RefObject<HTMLDivElement>
  videoRef: React.RefObject<HTMLVideoElement>
  isWidget?: boolean

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
  hebrewMode: HebrewMode
  handleHebrewModeChange: (mode: HebrewMode) => void
  englishMode: EnglishMode
  handleEnglishModeChange: (mode: EnglishMode) => void

  // Live Subtitles
  liveSubtitleLang: string
  setLiveSubtitleLang: (lang: string) => void
  handleLiveSubtitleCue: (cue: SubtitleCue) => void

  // Dubbing
  dubbing: UseLiveDubbingState

  // Cast
  cast: CastSession

  // Recording
  setIsRecording: (recording: boolean) => void
  setRecordingDuration: (duration: number) => void

  // Channel Chat (Live TV)
  channelChat?: {
    showChat: boolean
    toggleChat: () => void
    hasUnreadMessages: boolean
  }

  // Live Trivia (Live TV)
  liveTrivia?: {
    enabled: boolean
    toggleEnabled: () => void
    hasActiveFact: boolean
  }

  // Catch-Up Summary (Live TV)
  catchUp?: {
    showSummary: boolean
    toggleSummary: () => void
    canRequest: boolean
  }

  // Callbacks
  onShowUpgrade?: () => void
  onHoveredButtonChange?: (button: string | null) => void
}

export function usePlayerControlRenderers({
  user,
  contentId,
  isLive,
  containerRef,
  videoRef,
  isWidget = false,
  usageStats,
  isAdmin = false,
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
  hebrewMode,
  handleHebrewModeChange,
  englishMode,
  handleEnglishModeChange,
  liveSubtitleLang,
  setLiveSubtitleLang,
  handleLiveSubtitleCue,
  dubbing,
  cast,
  setIsRecording,
  setRecordingDuration,
  channelChat,
  liveTrivia,
  catchUp,
  onShowUpgrade,
  onHoveredButtonChange,
}: UsePlayerControlRenderersParams) {
  const { t } = useTranslation()
  const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'

  const subtitleQuotaExceeded = !isAdmin && !!usageStats && (
    usageStats.subtitle_available_hour <= 0 ||
    usageStats.subtitle_available_day <= 0 ||
    usageStats.subtitle_available_month <= 0
  )

  const dubbingQuotaExceeded = !isAdmin && !!usageStats && (
    usageStats.dubbing_available_hour <= 0 ||
    usageStats.dubbing_available_day <= 0 ||
    usageStats.dubbing_available_month <= 0
  )

  const renderWatchPartyButton = useCallback(() => null
  , [])

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
        hebrewMode={hebrewMode}
        onHebrewModeChange={handleHebrewModeChange}
        englishMode={englishMode}
        onEnglishModeChange={handleEnglishModeChange}
      />
    ) : null
  , [isLive, contentId, availableSubtitles, currentSubtitleLang, subtitlesEnabled, subtitleSettings,
     handleSubtitleLanguageChange, handleSubtitleToggle, handleSubtitleSettingsChange,
     fetchAvailableSubtitles, subtitlesLoading, containerRef, hebrewMode, handleHebrewModeChange,
     englishMode, handleEnglishModeChange])

  const renderLiveSubtitleControls = useCallback(() =>
    isLive && contentId && !isWidget ? (
      <LiveSubtitleControls
        channelId={contentId}
        isLive={isLive}
        isPremium={isPremium}
        videoElement={videoRef.current}
        onSubtitleCue={handleLiveSubtitleCue}
        onShowUpgrade={onShowUpgrade}
        targetLang={liveSubtitleLang}
        onLanguageChange={setLiveSubtitleLang}
        availableLanguages={dubbing.availableLanguages}
        sourceLanguage={dubbing.availability?.source_language}
        onDisableDubbing={dubbing.disconnect}
        onHoveredButtonChange={onHoveredButtonChange}
        quotaExceeded={subtitleQuotaExceeded}
        isDubbingActive={dubbing.isConnected}
      />
    ) : null
  , [isLive, contentId, isWidget, isPremium, videoRef, handleLiveSubtitleCue, onShowUpgrade,
     liveSubtitleLang, setLiveSubtitleLang, dubbing.disconnect, dubbing.isConnected, onHoveredButtonChange, subtitleQuotaExceeded])

  const renderDubbingControls = useCallback(() =>
    isLive && contentId && !isWidget ? (
      <DubbingControls
        isEnabled={dubbing.isConnected}
        isConnecting={dubbing.isConnecting}
        isAvailable={dubbing.isAvailable}
        isPremium={isPremium}
        quotaExceeded={dubbingQuotaExceeded}
        targetLanguage={dubbing.targetLanguage}
        availableLanguages={dubbing.availableLanguages}
        availableVoices={dubbing.availableVoices}
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
            dubbing.connect(dubbing.targetLanguage)
          }
        }}
        onLanguageChange={dubbing.setTargetLanguage}
        onOriginalVolumeChange={dubbing.setOriginalVolume}
        onDubbedVolumeChange={dubbing.setDubbedVolume}
        onVoiceChange={(voiceId) => {
          // Reconnect with new voice
          if (dubbing.isConnected) {
            dubbing.disconnect()
            setTimeout(() => dubbing.connect(dubbing.targetLanguage, voiceId), 500)
          }
        }}
        onShowUpgrade={onShowUpgrade}
        onHoveredButtonChange={onHoveredButtonChange}
        sourceLanguage={dubbing.availability?.source_language}
      />
    ) : null
  , [isLive, contentId, isWidget, isPremium, dubbing, onShowUpgrade, onHoveredButtonChange, dubbingQuotaExceeded])

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

  const renderCastButton = useCallback(() =>
    cast.isAvailable ? (
      <CastButton
        castSession={cast}
        onHoveredButtonChange={onHoveredButtonChange}
      />
    ) : null
  , [cast, onHoveredButtonChange])

  const renderChannelChatButton = useCallback(() => {
    if (!channelChat) return null
    const chatLabel = isLive
      ? t('player.liveChat', 'Live Chat')
      : t('player.chat', 'Chat')
    return (
      <LiveFeatureButton
        label={chatLabel}
        icon={<MessageCircle size={18} color={channelChat.showChat ? colors.text : colors.textSecondary} />}
        isActive={channelChat.showChat}
        onPress={channelChat.toggleChat}
      />
    )
  }, [isLive, channelChat, t])

  const renderLiveTriviaButton = useCallback(() => {
    if (!isLive || !liveTrivia) return null
    return (
      <LiveFeatureButton
        label={t('player.liveTrivia', 'Live Trivia')}
        icon={<Lightbulb size={18} color={liveTrivia.enabled ? colors.text : colors.textSecondary} />}
        isActive={liveTrivia.enabled}
        onPress={liveTrivia.toggleEnabled}
      />
    )
  }, [isLive, liveTrivia, t])

  const renderCatchUpButton = useCallback(() =>
    isLive && catchUp ? (
      <CatchUpButton
        onPress={catchUp.toggleSummary}
        isLoading={false}
      />
    ) : null
  , [isLive, catchUp])

  return useMemo(() => ({
    renderWatchPartyButton,
    renderSubtitleControls,
    renderLiveSubtitleControls,
    renderDubbingControls,
    renderRecordButton,
    renderCastButton,
    renderChannelChatButton,
    renderLiveTriviaButton,
    renderCatchUpButton,
  }), [
    renderWatchPartyButton,
    renderSubtitleControls,
    renderLiveSubtitleControls,
    renderDubbingControls,
    renderRecordButton,
    renderCastButton,
    renderChannelChatButton,
    renderLiveTriviaButton,
    renderCatchUpButton,
  ])
}
