import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { ttsService } from '@bayit/shared/services/ttsService'
import VideoPlayerOverlays from './VideoPlayerOverlays'
import VideoPlayerPanels from './VideoPlayerPanels'
import VideoPlayerControlsOverlay from './VideoPlayerControlsOverlay'
import VideoPlayerWatchParty from './VideoPlayerWatchParty'
import { BufferedLiveDubbingPlayer } from '../BufferedLiveDubbingPlayer'
import {
  useVideoPlayer,
  useSubtitles,
  useLiveSubtitles,
  useWatchParty,
  useLiveDubbing,
  useTrivia,
  usePlayerPanels,
  usePlayerControlRenderers,
} from './hooks'
import { useLiveFeatureQuota } from '@/hooks/useLiveFeatureQuota'
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
}: VideoPlayerProps) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { usageStats } = useLiveFeatureQuota()
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const { videoRef, containerRef, state, controls } = useVideoPlayer({
    src,
    isLive,
    autoPlay,
    initialSeekTime,
    onProgress,
    onEnded,
    contentId,
  })

  const {
    subtitlesEnabled,
    currentSubtitleLang,
    availableSubtitles,
    subtitlesLoading,
    currentCues,
    subtitleSettings,
    handleSubtitleToggle,
    handleSubtitleLanguageChange,
    handleSubtitleSettingsChange,
    fetchAvailableSubtitles,
  } = useSubtitles({ contentId, isLive })

  const {
    liveSubtitleLang,
    visibleLiveSubtitles,
    setLiveSubtitleLang,
    handleLiveSubtitleCue,
  } = useLiveSubtitles()

  const dubbing = useLiveDubbing({
    channelId: contentId || '',
    videoElement: videoRef.current,
    // Forward dubbed audio to buffered player if active
    onRawDubbedAudio: (audio, text) => {
      if (bufferedPlayerAddSegment) {
        bufferedPlayerAddSegment(audio, text)
      }
    },
  })

  const trivia = useTrivia({
    contentId,
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

  const [isMobile, setIsMobile] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTTSPlaying, setIsTTSPlaying] = useState(false)
  const [bufferedPlayerAddSegment, setBufferedPlayerAddSegment] = useState<
    ((audio: ArrayBuffer, text: string) => void) | null
  >(null)

  // Clear buffered player callback when dubbing disconnects
  useEffect(() => {
    if (!dubbing.isConnected) {
      setBufferedPlayerAddSegment(null)
    }
  }, [dubbing.isConnected])

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
    renderDubbingControls,
    renderRecordButton,
  } = usePlayerControlRenderers({
    user,
    contentId,
    isLive,
    containerRef,
    videoRef,
    isWidget,
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
    onHoveredButtonChange: setHoveredButton,
  })

  // Stable callbacks for BufferedLiveDubbingPlayer to prevent re-render loops
  const handleBufferedPlayerReady = useCallback((addSegment: (audio: ArrayBuffer, text: string) => void) => {
    console.log('[VideoPlayer] Buffered player ready')
    setBufferedPlayerAddSegment(() => addSegment)
  }, [])

  const handleBufferedPlayerError = useCallback((error: string) => {
    console.error('[VideoPlayer] Buffered dubbing error:', error)
    dubbing.disconnect()
  }, [dubbing])

  return (
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={controls.togglePlay}
    >
      {isLive && dubbing.isConnected ? (
        // Buffered live dubbing player for synchronized video+audio
        // Pass videoRef so liveDubbingService can capture audio from it
        <BufferedLiveDubbingPlayer
          streamUrl={src}
          videoRef={videoRef}
          onPlayerReady={handleBufferedPlayerReady}
          onError={handleBufferedPlayerError}
        />
      ) : (
        // Regular video element
        <video
          ref={videoRef}
          poster={poster}
          style={webStyles.video}
          playsInline
        />
      )}

      <VideoPlayerOverlays
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isLive={isLive}
        contentId={contentId}
        currentTime={state.currentTime}
        subtitlesEnabled={subtitlesEnabled}
        currentSubtitleLang={currentSubtitleLang}
        currentCues={currentCues}
        subtitleSettings={subtitleSettings}
        visibleLiveSubtitles={visibleLiveSubtitles}
        dubbingIsConnected={dubbing.isConnected}
        dubbingLastTranscript={dubbing.lastTranscript}
        dubbingLastTranslation={dubbing.lastTranslation}
        dubbingLatencyMs={dubbing.latencyMs}
        triviaEnabled={trivia.triviaEnabled}
        currentFact={trivia.currentFact}
        onDismissFact={trivia.dismissFact}
        isTTSPlaying={isTTSPlaying}
        usageStats={usageStats}
        loading={state.loading}
        isWidget={isWidget}
      />

      <VideoPlayerPanels
        isLive={isLive}
        videoRef={videoRef}
        showChaptersPanel={showChaptersPanel}
        chapters={chapters}
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
        availableQualities={state.availableQualities}
        currentQuality={state.currentQuality}
        currentPlaybackSpeed={state.playbackSpeed}
        onSettingsClose={() => setShowSettings(false)}
        onLiveSubtitleLangChange={setLiveSubtitleLang}
        onQualityChange={controls.changeQuality}
        onPlaybackSpeedChange={controls.setPlaybackSpeed}
      />

      <VideoPlayerControlsOverlay
        state={state}
        controls={controls}
        isLive={isLive}
        title={title}
        chapters={chapters}
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
        renderDubbingControls={renderDubbingControls}
        renderRecordButton={renderRecordButton}
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
        title={title}
      />
    </div>
  )
}

const webStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
}
