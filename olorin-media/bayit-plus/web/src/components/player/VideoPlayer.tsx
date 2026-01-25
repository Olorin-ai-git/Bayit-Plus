import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { ttsService } from '@bayit/shared/services/ttsService'
import VideoPlayerOverlays from './VideoPlayerOverlays'
import VideoPlayerPanels from './VideoPlayerPanels'
import VideoPlayerControlsOverlay from './VideoPlayerControlsOverlay'
import VideoPlayerWatchParty from './VideoPlayerWatchParty'
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
}: VideoPlayerProps) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { usageStats } = useLiveFeatureQuota()
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
  })

  return (
    <div
      ref={containerRef}
      style={webStyles.container}
      onClick={controls.togglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        style={webStyles.video}
        playsInline
      />

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
        liveSubtitleLang={liveSubtitleLang}
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
