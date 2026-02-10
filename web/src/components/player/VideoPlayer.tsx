import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@bayit/shared-stores/authStore'
import { ttsService } from '@bayit/shared-services/ttsService'
import liveSubtitleService from '@/services/liveSubtitleService'
import logger from '@/utils/logger'
import VideoPlayerOverlays from './VideoPlayerOverlays'
import VideoPlayerPanels from './VideoPlayerPanels'
import VideoPlayerControlsOverlay from './VideoPlayerControlsOverlay'
import VideoPlayerWatchParty from './VideoPlayerWatchParty'
import VideoPlayerCatchUp from './VideoPlayerCatchUp'
import GlassChatSidebar from './chat/GlassChatSidebar'
import { StreamLimitExceededModal } from './StreamLimitExceededModal'
import { ComprehensionQuizOverlay } from '@bayit/shared/quiz/ComprehensionQuizOverlay'
import {
  useVideoPlayer,
  useSubtitles,
  useLiveSubtitles,
  useLiveSplitSubtitles,
  useWatchParty,
  useLiveDubbing,
  useTrivia,
  useLiveTrivia,
  useCatchUp,
  usePlayerPanels,
  usePlayerControlRenderers,
  useCastSession,
  usePlaybackSession,
  useAudioTracks,
  useComprehensionQuizIntegration,
  useWizardMediaEvents,
  usePictureInPicture,
} from './hooks'
import { SplitLanguages } from '@/types/subtitle'
import { useChannelChatStore } from '@/stores/channelChatSlice'
import { castConfig } from '@/config/castConfig'
import { useLiveFeatureQuota } from '@/hooks/useLiveFeatureQuota'
import { useBetaUser } from '@/hooks/useBetaUser'
import { VideoPlayerProps } from './types'

export default function VideoPlayer({
  src,
  poster,
  title,
  contentId,
  contentType = 'vod',
  onProgress,
  onEnded,
  isLive = false,
  availableSubtitleLanguages = [],
  autoPlay = false,
  chapters = [],
  chaptersLoading = false,
  initialSeekTime,
  onShowUpgrade,
  isWidget = false,
  isTranscoded = false,
  contentDuration,
  directUrl,
  savedPosition,
  onRestartComplete,
  initialSubtitleLang,
  initialSplitMode,
  initialSplitLanguages,
  isHLS = false,
}: VideoPlayerProps) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { usageStats } = useLiveFeatureQuota()
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [showStreamLimitModal, setShowStreamLimitModal] = useState(false)
  const [streamLimitError, setStreamLimitError] = useState<{
    maxStreams: number
    activeStreams: number
    activeDevices: Array<{ device_id: string; device_name: string; content_id: string }>
  } | null>(null)

  const { videoRef, containerRef, state, controls, destroyHLS } = useVideoPlayer({
    src,
    isLive,
    autoPlay,
    initialSeekTime,
    onProgress,
    onEnded,
    contentId,
    isTranscoded,
    contentDuration,
    savedPosition,
    onRestartComplete,
  })

  // Audio tracks for VOD content (AI-generated variants)
  const {
    audioTracks,
    loading: audioTracksLoading,
    selectedTrackId: selectedAudioTrackId,
    handleTrackChange: handleAudioTrackChange,
  } = useAudioTracks({
    contentId: contentId || '',
    contentType,
    hlsInstance: (videoRef.current as any)?._hls || null,
    enabled: !isLive && contentType === 'vod',
  })

  const {
    subtitlesEnabled,
    currentSubtitleLang,
    hebrewMode,
    englishMode,
    availableSubtitles,
    subtitlesLoading,
    currentCues,
    subtitleSettings,
    // Split mode state
    splitMode,
    splitLanguages,
    splitCues,
    // Handlers
    handleSubtitleToggle: handleSubtitleToggleWithEnabled,
    handleSubtitleLanguageChange,
    handleHebrewModeChange,
    handleEnglishModeChange,
    handleSubtitleSettingsChange,
    handleSplitModeToggle,
    handleSplitLanguagesChange,
    fetchAvailableSubtitles,
  } = useSubtitles({ contentId, isLive, initialSubtitleLang, initialSplitMode, initialSplitLanguages })

  // No-arg wrapper for usePlayerControlRenderers which expects () => void
  const handleSubtitleToggle = useCallback(() => {
    handleSubtitleToggleWithEnabled(!subtitlesEnabled)
  }, [handleSubtitleToggleWithEnabled, subtitlesEnabled])

  const {
    liveSubtitleLang,
    visibleLiveSubtitles,
    setLiveSubtitleLang,
    handleLiveSubtitleCue,
  } = useLiveSubtitles()

  // Live split subtitles state
  const [liveSplitMode, setLiveSplitMode] = useState(false)
  const [liveSplitLanguages, setLiveSplitLanguages] = useState<SplitLanguages | null>(null)

  // Live split subtitles error handler - memoized to prevent infinite loops
  const handleLiveSplitError = useCallback((error: string) => {
    logger.error('Live split subtitle error', 'VideoPlayer', { error })
  }, [])

  // Live split subtitles hook
  const liveSplit = useLiveSplitSubtitles({
    channelId: contentId || '',
    splitMode: liveSplitMode,
    splitLanguages: liveSplitLanguages,
    videoElement: videoRef.current,
    sourceLanguage: 'he',
    hebrewMode: 'regular',
    onError: handleLiveSplitError,
  })

  // Handle live split mode toggle
  const handleLiveSplitModeToggle = useCallback((enabled: boolean) => {
    setLiveSplitMode(enabled)
    if (!enabled) {
      setLiveSplitLanguages(null)
    }
    logger.info('Live split mode toggled', 'VideoPlayer', { enabled })
  }, [])

  // Handle live split languages change
  const handleLiveSplitLanguagesChange = useCallback((languages: SplitLanguages) => {
    setLiveSplitLanguages(languages)
    setLiveSplitMode(true)
    logger.info('Live split languages selected', 'VideoPlayer', { languages })
  }, [])

  // Wire wizard voice commands to player controls and subtitle handlers
  useWizardMediaEvents({
    controls,
    state,
    videoRef,
    onSubtitleToggle: handleSubtitleToggleWithEnabled,
    onSubtitleLanguageChange: handleSubtitleLanguageChange,
  })

  const dubbing = useLiveDubbing({
    channelId: contentId || '',
    videoElement: videoRef.current,
  })


  const cast = useCastSession({
    videoRef,
    metadata: {
      title: title || '',
      posterUrl: poster,
      contentId: contentId || '',
      streamUrl: src,
      duration: state.duration,
    },
    enabled: !isWidget && castConfig.featureEnabled,
    isHLS,
    originalStreamUrl: src, // Pass original .m3u8 URL for AirPlay HLS fix
    destroyHLS, // Pass HLS.js destroy callback for AirPlay source switch
  })

  // Picture-in-Picture support
  const pip = usePictureInPicture({
    videoRef,
    disabled: isWidget,
  })

  // Playback session management for concurrent stream limit enforcement
  const { sessionId } = usePlaybackSession({
    contentId,
    contentType: (contentType || 'vod') as 'vod' | 'live' | 'podcast' | 'radio',
    isPlaying: state.isPlaying,
    enabled: !isWidget && !!user, // Only track sessions for logged-in users
    onLimitExceeded: (error) => {
      setStreamLimitError({
        maxStreams: error.max_streams,
        activeStreams: error.active_sessions,
        activeDevices: error.active_devices,
      })
      setShowStreamLimitModal(true)
      // Pause playback when limit is exceeded
      if (videoRef.current) {
        videoRef.current.pause()
      }
    },
  })

  // VOD trivia - only pass contentId for non-live content to prevent API calls
  const trivia = useTrivia({
    contentId: isLive ? undefined : contentId,
    language: i18n.language,
    currentTime: state.currentTime,
    isPlaying: state.isPlaying && !isLive,
  })

  const {
    party,
    participants,
    messages,
    isHost,
    isSynced,
    hostPaused,
    showCreateModal,
    showJoinModal,
    showPartyPanel,
    setShowCreateModal,
    setShowJoinModal,
    setShowPartyPanel,
    handleCreateParty,
    handleJoinParty,
    handleLeaveParty,
    handleEndParty,
    sendMessage,
  } = useWatchParty({
    contentId,
    contentType,
    title,
    videoRef,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
  })

  const {
    showChaptersPanel,
    showSceneSearchPanel,
    showSettings,
    toggleChaptersPanel,
    toggleSceneSearchPanel,
    toggleSettings,
    setShowChaptersPanel,
    setShowSceneSearchPanel,
    setShowSettings,
  } = usePlayerPanels()

  // Check if user is Beta 500 user
  const { isBetaUser, isLoading: isBetaUserLoading } = useBetaUser(user?.id)

  // Live trivia for live TV
  const liveTrivia = useLiveTrivia({
    channelId: isLive ? contentId : undefined,
    language: i18n.language,
    enabled: false, // Start disabled, user must click to enable
  })

  // Comprehension quiz integration for VOD content
  const comprehensionQuiz = useComprehensionQuizIntegration({
    videoRef,
    contentId: contentId || '',
    subtitles: currentCues,
    enabled: !isLive && contentType === 'vod',
    isLive,
    language: i18n.language,
  })

  // Forward subtitle transcripts to trivia when both are active
  const handleLiveSubtitleCueWithTrivia = useCallback(
    (cue: Parameters<typeof handleLiveSubtitleCue>[0]) => {
      handleLiveSubtitleCue(cue)
      if (liveTrivia.isConnected && cue.original_text) {
        liveTrivia.sendTranscript(cue.original_text, cue.source_lang)
      }
    },
    [handleLiveSubtitleCue, liveTrivia.isConnected, liveTrivia.sendTranscript],
  )

  // Handle trivia toggle - auto-enable live translation if needed
  const handleTriviaToggle = useCallback(async () => {
    const newEnabled = !liveTrivia.isEnabled

    // If enabling trivia, ensure live translation is also enabled
    if (newEnabled && !liveSubtitleService.isServiceConnected() && videoRef.current) {
      try {
        logger.info('Auto-enabling live translation for trivia', 'VideoPlayer')
        await liveSubtitleService.connect(
          contentId || '',
          liveSubtitleLang,
          videoRef.current,
          handleLiveSubtitleCueWithTrivia,
          (error) => {
            logger.error('Failed to auto-enable live translation for trivia', 'VideoPlayer', error)
          }
        )
        logger.info('Live translation auto-enabled successfully', 'VideoPlayer')
      } catch (error) {
        logger.error('Failed to connect live translation for trivia', 'VideoPlayer', error)
      }
    }

    // Toggle trivia
    liveTrivia.setEnabled(newEnabled)
  }, [liveTrivia.isEnabled, liveTrivia.setEnabled, contentId, liveSubtitleLang, videoRef, handleLiveSubtitleCueWithTrivia])

  // Channel chat visibility (Zustand store - persisted)
  const { isChatVisible, toggleChatVisibility } = useChannelChatStore()

  // Catchup summaries for live TV (Beta 500 only)
  const catchUp = useCatchUp({
    channelId: isLive ? contentId || '' : '',
    isBetaUser: isBetaUser,
  })

  const [isMobile, setIsMobile] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTTSPlaying, setIsTTSPlaying] = useState(false)

  // Collect live feature errors for unified banner display
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const liveFeatureError = useMemo(() => {
    const errors = [
      dubbing.error,
      catchUp.error,
    ].filter(Boolean)
    const activeError = errors[0] || null
    if (activeError === dismissedError) return null
    return activeError
  }, [dubbing.error, catchUp.error, dismissedError])

  const handleDismissLiveFeatureError = useCallback(() => {
    setDismissedError(liveFeatureError)
  }, [liveFeatureError])

  // Reset dismissed error when a new error appears
  useEffect(() => {
    const currentError = [dubbing.error, catchUp.error].filter(Boolean)[0] || null
    if (currentError && currentError !== dismissedError) {
      setDismissedError(null)
    }
  }, [dubbing.error, catchUp.error, dismissedError])


  // Update cast metadata when content changes
  // Note: cast.updateMetadata is intentionally excluded from deps to prevent infinite loops
  // The function reference may change but its behavior is stable
  useEffect(() => {
    if (cast.unified.isConnected) {
      cast.unified.updateMetadata({
        title: title || '',
        posterUrl: poster,
        contentId: contentId || '',
        streamUrl: src,
        duration: state.duration,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, poster, contentId, src, state.duration, cast.unified.isConnected])

  // Sync playback state to cast device
  // Note: cast.syncPlaybackState is intentionally excluded from deps to prevent infinite loops
  useEffect(() => {
    if (cast.unified.isConnected && castConfig.autoSync) {
      const interval = setInterval(() => {
        cast.unified.syncPlaybackState({
          currentTime: state.currentTime,
          isPlaying: state.isPlaying,
          volume: state.volume,
        })
      }, castConfig.syncIntervalMs)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast.unified.isConnected, state.currentTime, state.isPlaying, state.volume])

  useEffect(() => {
    const handleTTSPlaying = () => setIsTTSPlaying(true)
    const handleTTSStopped = () => setIsTTSPlaying(false)

    ttsService.on('playing', handleTTSPlaying)
    ttsService.on('stopped', handleTTSStopped)
    ttsService.on('completed', handleTTSStopped)

    setIsTTSPlaying(ttsService.isCurrentlyPlaying())

    return () => {
      ttsService.off('playing', handleTTSPlaying)
      ttsService.off('stopped', handleTTSStopped)
      ttsService.off('completed', handleTTSStopped)
    }
  }, [])

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const {
    renderWatchPartyButton,
    renderSubtitleControls,
    renderLiveSubtitleControls,
    renderLiveSplitSubtitleControls,
    renderDubbingControls,
    renderRecordButton,
    renderCastButton,
    renderAirPlayButton,
    renderChromecastButton,
    renderPiPButton,
    renderChannelChatButton,
    renderLiveTriviaButton,
    renderCatchUpButton,
  } = usePlayerControlRenderers({
    user,
    contentId,
    isLive,
    containerRef,
    videoRef,
    isWidget,
    usageStats,
    isAdmin,
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
    splitMode,
    handleSplitModeToggle,
    splitLanguages,
    handleSplitLanguagesChange,
    liveSubtitleLang,
    setLiveSubtitleLang,
    handleLiveSubtitleCue: handleLiveSubtitleCueWithTrivia as any,
    liveSplitMode,
    handleLiveSplitModeToggle,
    liveSplitLanguages,
    handleLiveSplitLanguagesChange,
    liveSplitConnected: liveSplit.isConnected,
    liveSplitConnecting: liveSplit.isConnecting,
    dubbing,
    cast,
    pip,
    setIsRecording,
    setRecordingDuration,
    channelChat: contentId ? {
      showChat: isChatVisible,
      toggleChat: toggleChatVisibility,
      hasUnreadMessages: false,
    } : undefined,
    liveTrivia: isLive ? {
      enabled: liveTrivia.isEnabled,
      toggleEnabled: handleTriviaToggle,
      hasActiveFact: liveTrivia.currentFact !== null,
    } : undefined,
    catchUp: isLive && isBetaUser && !isBetaUserLoading ? {
      showSummary: catchUp.showSummary,
      toggleSummary: () => catchUp.showSummary ? catchUp.closeSummary() : catchUp.fetchSummary(),
      canRequest: catchUp.isAvailable && catchUp.hasCredits && !catchUp.isLoading,
    } : undefined,
    onShowUpgrade,
    onHoveredButtonChange: setHoveredButton,
  })


  return (
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={controls.togglePlay}
    >
      {/* Video element - always rendered, dubbing handled by ContinuousPlaybackController */}
      <video
        ref={videoRef}
        poster={poster}
        style={webStyles.video}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />

      <VideoPlayerOverlays
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isLive={isLive}
        contentId={contentId}
        currentTime={state.currentTime}
        subtitlesEnabled={subtitlesEnabled}
        currentSubtitleLang={currentSubtitleLang}
        currentCues={currentCues as any}
        subtitleSettings={subtitleSettings}
        splitMode={splitMode}
        splitLanguages={splitLanguages}
        splitCues={splitCues as any}
        visibleLiveSubtitles={visibleLiveSubtitles as any}
        liveSplitMode={liveSplitMode}
        liveSplitLanguages={liveSplitLanguages}
        liveSplitPrimaryCues={liveSplit.primaryCues}
        liveSplitSecondaryCues={liveSplit.secondaryCues}
        dubbingIsConnected={dubbing.isConnected}
        dubbingLastTranscript={dubbing.lastTranscript}
        dubbingLastTranslation={dubbing.lastTranslation}
        dubbingLatencyMs={dubbing.latencyMs}
        triviaEnabled={trivia.triviaEnabled}
        currentFact={trivia.currentFact}
        onDismissFact={trivia.dismissFact}
        onTriviaHoverStart={trivia.onHoverStart}
        onTriviaHoverEnd={trivia.onHoverEnd}
        isTTSPlaying={isTTSPlaying}
        usageStats={usageStats as any}
        loading={state.loading}
        error={state.error}
        isWidget={isWidget}
        isCasting={cast.unified.isConnected}
        userEmail={user?.email}
        isPlaying={state.isPlaying}
      />

      <VideoPlayerPanels
        isLive={isLive}
        videoRef={videoRef}
        showChaptersPanel={showChaptersPanel}
        chapters={chapters as any}
        chaptersLoading={chaptersLoading}
        currentTime={state.currentTime}
        duration={state.duration}
        onChaptersClose={() => setShowChaptersPanel(false)}
        onSeek={controls.seekToTime}
        showSceneSearchPanel={showSceneSearchPanel}
        contentId={contentId}
        onSceneSearchClose={() => setShowSceneSearchPanel(false)}
        showSettings={showSettings}
        availableSubtitleLanguages={availableSubtitleLanguages}
        liveSubtitleLang={liveSubtitleLang}
        availableQualities={(state.availableQualities || []).map(q => q.quality)}
        currentQuality={state.currentQuality || ''}
        currentPlaybackSpeed={state.playbackSpeed}
        onSettingsClose={() => setShowSettings(false)}
        onLiveSubtitleLangChange={setLiveSubtitleLang}
        onQualityChange={(quality) => { controls.changeQuality?.(quality) }}
        onPlaybackSpeedChange={controls.setPlaybackSpeed}
      />

      <VideoPlayerControlsOverlay
        state={state}
        controls={controls}
        isLive={isLive}
        title={title || ''}
        chapters={chapters as any}
        availableSubtitles={availableSubtitles}
        showChaptersPanel={showChaptersPanel}
        showSceneSearchPanel={showSceneSearchPanel}
        showSettings={showSettings}
        liveSubtitleLang={dubbing.isConnected ? dubbing.targetLanguage : liveSubtitleLang}
        availableLanguages={dubbing.availableLanguages}
        onLanguageChange={(lang) => {
          setLiveSubtitleLang(lang)
          dubbing.setTargetLanguage(lang)
        }}
        isDubbingActive={dubbing.isConnected}
        toggleChaptersPanel={toggleChaptersPanel}
        toggleSceneSearchPanel={toggleSceneSearchPanel}
        toggleSettings={toggleSettings}
        contentId={contentId}
        renderWatchPartyButton={renderWatchPartyButton}
        renderSubtitleControls={renderSubtitleControls}
        renderLiveSubtitleControls={renderLiveSubtitleControls}
        renderLiveSplitSubtitleControls={renderLiveSplitSubtitleControls}
        renderDubbingControls={renderDubbingControls}
        renderRecordButton={renderRecordButton}
        renderCastButton={renderCastButton}
        renderAirPlayButton={renderAirPlayButton}
        renderChromecastButton={renderChromecastButton}
        renderPiPButton={renderPiPButton}
        renderChannelChatButton={renderChannelChatButton}
        renderLiveTriviaButton={renderLiveTriviaButton}
        renderCatchUpButton={renderCatchUpButton}
        liveFeatureError={liveFeatureError}
        onDismissLiveFeatureError={handleDismissLiveFeatureError}
      />

      <VideoPlayerWatchParty
        isMobile={isMobile}
        showPartyPanel={showPartyPanel}
        setShowPartyPanel={setShowPartyPanel}
        showCreateModal={showCreateModal}
        showJoinModal={showJoinModal}
        setShowCreateModal={setShowCreateModal}
        setShowJoinModal={setShowJoinModal}
        party={party}
        participants={participants}
        messages={messages}
        isHost={isHost}
        isSynced={isSynced}
        hostPaused={hostPaused}
        currentUserId={user?.id}
        handleCreateParty={(options, token) => handleCreateParty(options, user?.token)}
        handleJoinParty={(code, token) => handleJoinParty(code, user?.token)}
        handleLeaveParty={handleLeaveParty}
        handleEndParty={handleEndParty}
        sendMessage={sendMessage}
        title={title || ''}
      />

      {/* Channel Chat for Live TV and VOD */}
      {contentId && (
        <GlassChatSidebar
          channelId={contentId}
          isLiveChannel={isLive}
          isVisible={isChatVisible}
          onClose={toggleChatVisibility}
        />
      )}

      {/* Catch-Up Summary for Live TV (Beta 500 only) */}
      {isLive && isBetaUser && (
        <VideoPlayerCatchUp
          channelId={contentId || ''}
          isBetaUser={isBetaUser}
          creditBalance={catchUp.balance}
          creditCost={5}
          programName={title}
          autoDismissSeconds={30}
        />
      )}

      {streamLimitError && (
        <StreamLimitExceededModal
          visible={showStreamLimitModal}
          maxStreams={streamLimitError.maxStreams}
          activeStreams={streamLimitError.activeStreams}
          activeDevices={streamLimitError.activeDevices}
          onClose={() => setShowStreamLimitModal(false)}
        />
      )}

      {/* Comprehension Quiz Overlay for VOD */}
      {comprehensionQuiz.question && (
        <ComprehensionQuizOverlay
          visible={!!comprehensionQuiz.question}
          question={comprehensionQuiz.question}
          feedback={comprehensionQuiz.feedback}
          isLoading={comprehensionQuiz.isLoading}
          error={comprehensionQuiz.error}
          language={i18n.language}
          isRTL={i18n.language === 'he'}
          onAnswer={comprehensionQuiz.handleAnswer}
          onSkip={comprehensionQuiz.handleSkip}
        />
      )}
    </div>
  )
}

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    cursor: 'default',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
}
