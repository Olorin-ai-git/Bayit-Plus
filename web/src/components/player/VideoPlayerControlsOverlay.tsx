import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Icon } from '@olorin/shared-icons/web'
import { spacing, borderRadius, colors } from '@olorin/design-tokens'
import { GlassView, GlassBadge } from '@bayit/shared/ui'
import { getLanguageInfo } from '@/types/subtitle'
import PlayerControls from './PlayerControls'
import ProgressBar from './ProgressBar'
import VideoPlayerCenterControls from './VideoPlayerCenterControls'
import { Chapter } from '@/types/media'
import { SubtitleTrack } from '@/types/subtitle'
import { VideoPlayerState, VideoPlayerControls } from './hooks/useVideoPlayer'

interface VideoPlayerControlsOverlayProps {
  state: VideoPlayerState
  controls: VideoPlayerControls
  isLive: boolean
  title: string
  chapters: Chapter[]
  availableSubtitles: SubtitleTrack[]
  showChaptersPanel: boolean
  showSceneSearchPanel: boolean
  showSettings: boolean
  liveSubtitleLang: string
  availableLanguages?: string[]
  onLanguageChange?: (lang: string) => void
  isDubbingActive?: boolean
  toggleChaptersPanel: () => void
  toggleSceneSearchPanel: () => void
  toggleSettings: () => void
  renderWatchPartyButton: () => React.ReactNode
  renderSubtitleControls: () => React.ReactNode
  renderLiveSubtitleControls: () => React.ReactNode
  renderDubbingControls: () => React.ReactNode
  renderRecordButton: () => React.ReactNode
  renderCastButton?: () => React.ReactNode
  renderChannelChatButton?: () => React.ReactNode
  renderLiveTriviaButton?: () => React.ReactNode
  renderCatchUpButton?: () => React.ReactNode
  liveFeatureError?: string | null
  onDismissLiveFeatureError?: () => void
  contentId?: string
}

export default function VideoPlayerControlsOverlay({
  state,
  controls,
  isLive,
  title,
  chapters,
  availableSubtitles,
  showChaptersPanel,
  showSceneSearchPanel,
  showSettings,
  liveSubtitleLang,
  availableLanguages,
  onLanguageChange,
  isDubbingActive = false,
  toggleChaptersPanel,
  toggleSceneSearchPanel,
  toggleSettings,
  renderWatchPartyButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderDubbingControls,
  renderRecordButton,
  renderCastButton,
  renderChannelChatButton,
  renderLiveTriviaButton,
  renderCatchUpButton,
  liveFeatureError,
  onDismissLiveFeatureError,
  contentId,
}: VideoPlayerControlsOverlayProps) {
  const { t } = useTranslation()

  // Don't render overlay at all when controls are hidden
  if (!state.showControls) {
    return null
  }

  return (
    <View
      style={styles.controlsOverlay}
      pointerEvents="auto"
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {!isLive && availableSubtitles.length > 0 && (
              <View style={styles.subtitleFlagsRow}>
                {availableSubtitles.slice(0, 6).map((track) => {
                  const langInfo = getLanguageInfo(track.language)
                  return langInfo?.flag ? (
                    <Text key={track.id} style={styles.subtitleFlag}>
                      {langInfo.flag}
                    </Text>
                  ) : (
                    <Icon
                      key={track.id}
                      name="globe"
                      size="md"
                      color="#FFFFFF"
                    />
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
      <VideoPlayerCenterControls
        isLive={isLive}
        isPlaying={state.isPlaying}
        controls={controls}
      />

      {/* Bottom Controls */}
      <GlassView style={styles.bottomControls} intensity="high" noBorder>
          {!isLive && (
            <ProgressBar
              currentTime={state.currentTime}
              duration={state.duration}
              chapters={chapters}
              onSeek={controls.handleSeek}
              onChapterSeek={controls.seekToTime}
            />
          )}

          <PlayerControls
            state={state}
            controls={controls}
            isLive={isLive}
            liveSubtitleLang={liveSubtitleLang}
            availableLanguages={availableLanguages}
            onLanguageChange={onLanguageChange}
            isDubbingActive={isDubbingActive}
            showChaptersPanel={showChaptersPanel}
            showSceneSearchPanel={showSceneSearchPanel}
            showSettings={showSettings}
            hasChapters={chapters.length > 0}
            hasSceneSearch={!isLive && !!contentId}
            chapters={chapters}
            onChaptersPanelToggle={toggleChaptersPanel}
            onSceneSearchToggle={toggleSceneSearchPanel}
            onSettingsToggle={toggleSettings}
            renderWatchPartyButton={renderWatchPartyButton}
            renderSubtitleControls={renderSubtitleControls}
            renderLiveSubtitleControls={renderLiveSubtitleControls}
            renderDubbingControls={renderDubbingControls}
            renderRecordButton={renderRecordButton}
            renderCastButton={renderCastButton}
            renderChannelChatButton={renderChannelChatButton}
            renderLiveTriviaButton={renderLiveTriviaButton}
            renderCatchUpButton={renderCatchUpButton}
            liveFeatureError={liveFeatureError}
            onDismissLiveFeatureError={onDismissLiveFeatureError}
          />
        </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: 'linear-gradient(to top, rgba(17, 17, 34, 0.9), transparent 40%, transparent 60%, rgba(17, 17, 34, 0.4))' as any,
    zIndex: 10,
    transition: 'opacity 0.3s ease-in-out' as any,
  },
  controlsHidden: {
    opacity: 0,
    transition: 'opacity 0.5s ease-in-out' as any,
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
    overflow: 'visible',
    zIndex: 20,
  },
})
