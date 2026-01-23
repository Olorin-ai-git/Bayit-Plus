import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView, GlassBadge } from '@bayit/shared/ui'
import { useAuthStore } from '@/stores/authStore'
import { ttsService } from '@bayit/shared/services/ttsService'
import {
  WatchPartyButton,
  WatchPartyCreateModal,
  WatchPartyJoinModal,
  WatchPartyPanel,
  WatchPartyOverlay,
} from '@/components/watchparty'
import { getLanguageInfo } from '@/types/subtitle'
import ChaptersPanel from './ChaptersPanel'
import SceneSearchPanel from './SceneSearchPanel'
import SubtitleOverlay from './SubtitleOverlay'
import SubtitleControls from './SubtitleControls'
import LiveSubtitleControls from './LiveSubtitleControls'
import LiveSubtitleOverlay from './LiveSubtitleOverlay'
import liveSubtitleService from '@/services/liveSubtitleService'
import { DubbingControls, DubbingOverlay } from './dubbing'
import { RecordButton } from './RecordButton'
import { RecordingStatusIndicator } from './RecordingStatusIndicator'
import PlayerControls from './PlayerControls'
import ProgressBar from './ProgressBar'
import SettingsPanel from './SettingsPanel'
import TriviaOverlay from './TriviaOverlay'
import { useVideoPlayer, useSubtitles, useLiveSubtitles, useWatchParty, useLiveDubbing, useTrivia } from './hooks'
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
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  // Video player state and controls
  const { videoRef, containerRef, state, controls } = useVideoPlayer({
    src,
    isLive,
    autoPlay,
    initialSeekTime,
    onProgress,
    onEnded,
    contentId,
  })

  // Subtitle management
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

  // Live subtitle management
  const {
    liveSubtitleLang,
    visibleLiveSubtitles,
    setLiveSubtitleLang,
    handleLiveSubtitleCue,
  } = useLiveSubtitles()

  // Live dubbing management (Premium feature)
  const dubbing = useLiveDubbing({
    channelId: contentId || '',
    videoElement: videoRef.current,
  })

  // Trivia management (VOD only)
  const trivia = useTrivia({
    contentId,
    language: t('app.lang'),
    currentTime: state.currentTime,
    isPlaying: state.isPlaying && !isLive,
  })

  // Watch Party integration
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

  // Local UI state
  const [isMobile, setIsMobile] = useState(false)
  const [showChaptersPanel, setShowChaptersPanel] = useState(false)
  const [showSceneSearchPanel, setShowSceneSearchPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTTSPlaying, setIsTTSPlaying] = useState(false)

  // Track TTS state to prevent trivia display during TTS playback
  useEffect(() => {
    const handleTTSPlaying = () => setIsTTSPlaying(true)
    const handleTTSStopped = () => setIsTTSPlaying(false)

    ttsService.on('playing', handleTTSPlaying)
    ttsService.on('stopped', handleTTSStopped)
    ttsService.on('completed', handleTTSStopped)

    // Initialize with current state
    setIsTTSPlaying(ttsService.isCurrentlyPlaying())

    return () => {
      ttsService.off('playing', handleTTSPlaying)
      ttsService.off('stopped', handleTTSStopped)
      ttsService.off('completed', handleTTSStopped)
    }
  }, [])

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

      {/* Recording Status Indicator */}
      <RecordingStatusIndicator
        isRecording={isRecording}
        duration={recordingDuration}
      />

      {/* Subtitle Overlay */}
      {!isLive && contentId && (
        <SubtitleOverlay
          currentTime={state.currentTime}
          subtitles={currentCues}
          language={currentSubtitleLang || 'he'}
          enabled={subtitlesEnabled}
          settings={subtitleSettings}
        />
      )}

      {/* Live Subtitle Overlay (Premium) */}
      {isLive && <LiveSubtitleOverlay cues={visibleLiveSubtitles} />}

      {/* Live Dubbing Overlay (Premium) */}
      {isLive && (
        <DubbingOverlay
          isActive={dubbing.isConnected}
          originalText={dubbing.lastTranscript}
          translatedText={dubbing.lastTranslation}
          latencyMs={dubbing.latencyMs}
        />
      )}

      {/* Trivia Overlay (VOD only) */}
      {!isLive && trivia.triviaEnabled && (
        <TriviaOverlay
          fact={trivia.currentFact}
          onDismiss={trivia.dismissFact}
          isRTL={t('app.lang') === 'he'}
          isTTSPlaying={isTTSPlaying}
        />
      )}

      {/* Loading Spinner */}
      {state.loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.spinner}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}

      {/* Chapters Panel */}
      {!isLive && chapters.length > 0 && (
        <ChaptersPanel
          chapters={chapters}
          currentTime={state.currentTime}
          duration={state.duration}
          isLoading={chaptersLoading}
          isOpen={showChaptersPanel}
          onClose={() => setShowChaptersPanel(false)}
          onSeek={controls.seekToTime}
        />
      )}

      {/* Scene Search Panel */}
      {!isLive && contentId && (
        <SceneSearchPanel
          contentId={contentId}
          isOpen={showSceneSearchPanel}
          onClose={() => setShowSceneSearchPanel(false)}
          onSeek={controls.seekToTime}
        />
      )}

      {/* VOD Settings Panel */}
      {!isLive && (
        <SettingsPanel
          isOpen={showSettings}
          isLive={isLive}
          videoRef={videoRef}
          availableSubtitleLanguages={availableSubtitleLanguages}
          liveSubtitleLang={liveSubtitleLang}
          availableQualities={state.availableQualities}
          currentQuality={state.currentQuality}
          currentPlaybackSpeed={state.playbackSpeed}
          onClose={() => setShowSettings(false)}
          onLiveSubtitleLangChange={setLiveSubtitleLang}
          onQualityChange={controls.changeQuality}
          onPlaybackSpeedChange={controls.setPlaybackSpeed}
        />
      )}

      {/* Controls Overlay */}
      <View
        style={[
          styles.controlsOverlay,
          !state.showControls && styles.controlsHidden,
        ]}
        pointerEvents={state.showControls ? 'auto' : 'none'}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {/* Available Subtitle Languages */}
            {!isLive && availableSubtitles.length > 0 && (
              <View style={styles.subtitleFlagsRow}>
                {availableSubtitles.slice(0, 6).map((track) => {
                  const langInfo = getLanguageInfo(track.language)
                  return (
                    <Text key={track.id} style={styles.subtitleFlag}>
                      {langInfo?.flag || '🌐'}
                    </Text>
                  )
                })}
                {availableSubtitles.length > 6 && (
                  <Text style={styles.subtitleFlagMore}>+{availableSubtitles.length - 6}</Text>
                )}
              </View>
            )}
          </View>
          {isLive && (
            <GlassBadge variant="danger" size="sm">{t('common.live')}</GlassBadge>
          )}
        </View>

        {/* Center Controls - Play/Pause with Skip Buttons */}
        <View style={styles.centerControls}>
          {/* Skip Backward 30s */}
          {!isLive && (
            <View
              onClick={(e: any) => {
                e?.stopPropagation?.()
                controls.skip(-30)
              }}
              style={styles.centerSkipButton}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
                <path d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6" />
              </svg>
              <Text style={styles.centerSkipText}>30</Text>
            </View>
          )}

          {/* Play/Pause Button */}
          <View
            onClick={(e: any) => {
              e?.stopPropagation?.()
              controls.togglePlay()
            }}
            style={styles.centerPlayButton}
          >
            {state.isPlaying ? (
              <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text}>
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            ) : (
              <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text} style={{ marginLeft: 4 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </View>

          {/* Skip Forward 30s */}
          {!isLive && (
            <View
              onClick={(e: any) => {
                e?.stopPropagation?.()
                controls.skip(30)
              }}
              style={styles.centerSkipButton}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
                <path d="M12 5V1l5 5-5 5V7a6 6 0 106 6" />
              </svg>
              <Text style={styles.centerSkipText}>30</Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <GlassView style={styles.bottomControls} intensity="high" noBorder>
          {/* Progress Bar */}
          {!isLive && (
            <ProgressBar
              currentTime={state.currentTime}
              duration={state.duration}
              chapters={chapters}
              onSeek={controls.handleSeek}
              onChapterSeek={controls.seekToTime}
            />
          )}

          {/* Controls Row */}
          <PlayerControls
            state={state}
            controls={controls}
            isLive={isLive}
            liveSubtitleLang={liveSubtitleLang}
            showChaptersPanel={showChaptersPanel}
            showSceneSearchPanel={showSceneSearchPanel}
            showSettings={showSettings}
            hasChapters={chapters.length > 0}
            hasSceneSearch={!isLive && !!contentId}
            chapters={chapters}
            onChaptersPanelToggle={() => setShowChaptersPanel(!showChaptersPanel)}
            onSceneSearchToggle={() => setShowSceneSearchPanel(!showSceneSearchPanel)}
            onSettingsToggle={() => setShowSettings(!showSettings)}
            renderWatchPartyButton={() =>
              user && contentId ? (
                <WatchPartyButton
                  hasActiveParty={!!party}
                  onCreateClick={() => setShowCreateModal(true)}
                  onJoinClick={() => setShowJoinModal(true)}
                  onPanelToggle={() => setShowPartyPanel(!showPartyPanel)}
                />
              ) : null
            }
            renderSubtitleControls={() =>
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
            }
            renderLiveSubtitleControls={() =>
              isLive && contentId ? (
                <LiveSubtitleControls
                  channelId={contentId}
                  isLive={isLive}
                  isPremium={user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'}
                  videoElement={videoRef.current}
                  onSubtitleCue={handleLiveSubtitleCue}
                  onShowUpgrade={onShowUpgrade}
                  targetLang={liveSubtitleLang}
                  onLanguageChange={setLiveSubtitleLang}
                  onDisableDubbing={dubbing.disconnect}
                />
              ) : null
            }
            renderDubbingControls={() =>
              isLive && contentId ? (
                <DubbingControls
                  isEnabled={dubbing.isConnected}
                  isConnecting={dubbing.isConnecting}
                  isAvailable={dubbing.isAvailable}
                  isPremium={user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'}
                  targetLanguage={dubbing.targetLanguage}
                  availableLanguages={dubbing.availableLanguages}
                  latencyMs={dubbing.latencyMs}
                  error={dubbing.error}
                  onDisableSubtitles={() => liveSubtitleService.disconnect()}
                  onToggle={() => dubbing.isConnected ? dubbing.disconnect() : dubbing.connect()}
                  onLanguageChange={dubbing.setTargetLanguage}
                  onShowUpgrade={onShowUpgrade}
                />
              ) : null
            }
            renderRecordButton={() =>
              isLive && contentId ? (
                <RecordButton
                  channelId={contentId}
                  isLive={isLive}
                  isPremium={user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family'}
                  onShowUpgrade={onShowUpgrade}
                  onRecordingStateChange={(recording, duration) => {
                    setIsRecording(recording)
                    setRecordingDuration(duration)
                  }}
                />
              ) : null
            }
          />
        </GlassView>
      </View>

      {/* Watch Party Panel (Desktop) */}
      {!isMobile && (
        <WatchPartyPanel
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={user?.id}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      )}

      {/* Watch Party Overlay (Mobile) */}
      {isMobile && (
        <WatchPartyOverlay
          isOpen={showPartyPanel && !!party}
          onClose={() => setShowPartyPanel(false)}
          party={party}
          participants={participants}
          messages={messages}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          currentUserId={user?.id}
          onLeave={handleLeaveParty}
          onEnd={handleEndParty}
          onSendMessage={sendMessage}
        />
      )}

      {/* Modals */}
      <WatchPartyCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(options) => handleCreateParty(options, user?.token)}
        contentTitle={title}
      />

      <WatchPartyJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={(code) => handleJoinParty(code, user?.token)}
      />

      {/* Party Active Indicator Border */}
      {party && (
        <View style={styles.partyIndicator} pointerEvents="none" />
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
  },
  video: {
    width: '100%',
    height: '100%',
  },
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 48,
    height: 48,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: 'linear-gradient(to top, rgba(17, 17, 34, 0.9), transparent 40%, transparent 60%, rgba(17, 17, 34, 0.4))' as any,
  },
  controlsHidden: {
    opacity: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleFlagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  subtitleFlag: {
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleFlagMore: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  centerSkipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    cursor: 'pointer',
    opacity: 0.9,
  },
  centerSkipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: -4,
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    cursor: 'pointer',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  partyIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: borderRadius.lg,
  },
  liveControlsContainer: {
    gap: spacing.lg,
  },
  liveControlsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  controlSection: {
    gap: spacing.md,
  },
})
