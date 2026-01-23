/**
 * PlayerControls Component
 * Main control bar with play/pause, skip, volume, and action buttons
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  SkipBack,
  SkipForward,
  RotateCcw,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { PlayerState, PlayerControls as PlayerControlsType, Chapter } from './types'

interface PlayerControlsProps {
  state: PlayerState
  controls: PlayerControlsType
  isLive?: boolean
  showChaptersPanel?: boolean
  showSceneSearchPanel?: boolean
  showSettings?: boolean
  hasChapters?: boolean
  hasSceneSearch?: boolean
  chapters?: Chapter[]
  onChaptersPanelToggle?: () => void
  onSceneSearchToggle?: () => void
  onSettingsToggle?: () => void
  renderWatchPartyButton?: () => React.ReactNode
  renderSubtitleControls?: () => React.ReactNode
  renderLiveSubtitleControls?: () => React.ReactNode
  renderRecordButton?: () => React.ReactNode
}

export default function PlayerControls({
  state,
  controls,
  isLive = false,
  showChaptersPanel = false,
  showSceneSearchPanel = false,
  showSettings = false,
  hasChapters = false,
  hasSceneSearch = false,
  chapters = [],
  onChaptersPanelToggle,
  onSceneSearchToggle,
  onSettingsToggle,
  renderWatchPartyButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderRecordButton,
}: PlayerControlsProps) {
  const { t } = useTranslation()

  // Format playback speed display
  const speedDisplay = state.playbackSpeed !== 1 ? `${state.playbackSpeed}x` : null

  return (
    <View style={styles.controlsRow}>
      {/* Left Controls */}
      <View style={styles.leftControls}>
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); controls.togglePlay() }}
          style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
        >
          {state.isPlaying ? <Pause size={22} color={colors.text} /> : <Play size={22} color={colors.text} />}
        </Pressable>

        {!isLive && (
          <>
            {/* Chapter Navigation - Previous */}
            {hasChapters && chapters.length > 0 && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); controls.skipToPreviousChapter(chapters, state.currentTime) }}
                style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
                accessibilityLabel={t('player.previousChapter')}
              >
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
            )}

            {/* Skip Backward 30s */}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skip(-30) }}
              style={({ hovered }) => [styles.controlButton, styles.skipButton, hovered && styles.controlButtonHovered]}
              accessibilityLabel={t('player.skipBackward')}
            >
              <SkipBack size={16} color={colors.text} />
              <Text style={styles.skipText}>30</Text>
            </Pressable>

            {/* Skip Forward 30s */}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skip(30) }}
              style={({ hovered }) => [styles.controlButton, styles.skipButton, hovered && styles.controlButtonHovered]}
              accessibilityLabel={t('player.skipForward')}
            >
              <SkipForward size={16} color={colors.text} />
              <Text style={styles.skipText}>30</Text>
            </Pressable>

            {/* Chapter Navigation - Next */}
            {hasChapters && chapters.length > 0 && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); controls.skipToNextChapter(chapters, state.currentTime) }}
                style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
                accessibilityLabel={t('player.nextChapter')}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>
            )}

            {/* Restart */}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.handleRestart() }}
              style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
              accessibilityLabel={t('player.restart')}
            >
              <RotateCcw size={18} color={colors.text} />
            </Pressable>
          </>
        )}

        <View style={styles.volumeControls}>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); controls.toggleMute() }}
            style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
          >
            {state.isMuted ? <VolumeX size={18} color={colors.text} /> : <Volume2 size={18} color={colors.text} />}
          </Pressable>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.isMuted ? 0 : state.volume}
            onChange={controls.handleVolumeChange}
            onClick={(e) => e.stopPropagation()}
            style={webStyles.volumeSlider}
          />
        </View>

        {!isLive && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {controls.formatTime(state.currentTime)} / {controls.formatTime(state.duration)}
            </Text>
            {speedDisplay && (
              <Text style={styles.speedBadge}>{speedDisplay}</Text>
            )}
          </View>
        )}
      </View>

      {/* Right Controls */}
      <View style={styles.rightControls}>
        {renderWatchPartyButton && renderWatchPartyButton()}

        {!isLive && hasChapters && onChaptersPanelToggle && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onChaptersPanelToggle() }}
            style={({ hovered }) => [
              styles.controlButton,
              hovered && styles.controlButtonHovered,
              showChaptersPanel && styles.controlButtonActive,
            ]}
            accessibilityLabel={t('player.chapters')}
          >
            <List size={18} color={showChaptersPanel ? colors.primary : colors.text} />
          </Pressable>
        )}

        {hasSceneSearch && onSceneSearchToggle && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onSceneSearchToggle() }}
            style={({ hovered }) => [
              styles.controlButton,
              hovered && styles.controlButtonHovered,
              showSceneSearchPanel && styles.controlButtonActive,
            ]}
            accessibilityLabel={t('player.sceneSearch.title')}
          >
            <Search size={18} color={showSceneSearchPanel ? colors.primary : colors.text} />
          </Pressable>
        )}

        {renderSubtitleControls && renderSubtitleControls()}
        {renderLiveSubtitleControls && renderLiveSubtitleControls()}
        {renderRecordButton && renderRecordButton()}

        {onSettingsToggle && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onSettingsToggle()
            }}
            style={({ hovered }) => [
              styles.controlButton,
              hovered && styles.controlButtonHovered,
              showSettings && styles.controlButtonActive,
            ]}
          >
            <SettingsIcon size={18} color={showSettings ? colors.primary : colors.text} />
          </Pressable>
        )}

        <Pressable
          onPress={(e) => { e.stopPropagation?.(); controls.toggleFullscreen() }}
          style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
        >
          {state.isFullscreen ? <Minimize size={18} color={colors.text} /> : <Maximize size={18} color={colors.text} />}
        </Pressable>
      </View>
    </View>
  )
}

const webStyles: Record<string, React.CSSProperties> = {
  volumeSlider: {
    width: 80,
    accentColor: colors.primary,
  },
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButtonActive: {
    backgroundColor: colors.glassPurpleLight,
  },
  skipButton: {
    flexDirection: 'row',
    gap: 2,
    width: 44,
  },
  skipText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  speedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.glassPurpleLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
})
