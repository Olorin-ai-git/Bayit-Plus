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
} from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { PlayerState, PlayerControls as PlayerControlsType } from './types'

interface PlayerControlsProps {
  state: PlayerState
  controls: PlayerControlsType
  isLive?: boolean
  showChaptersPanel?: boolean
  showSettings?: boolean
  hasChapters?: boolean
  onChaptersPanelToggle?: () => void
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
  showSettings = false,
  hasChapters = false,
  onChaptersPanelToggle,
  onSettingsToggle,
  renderWatchPartyButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderRecordButton,
}: PlayerControlsProps) {
  const { t } = useTranslation()

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
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skip(-10) }}
              style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
            >
              <SkipBack size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.skip(10) }}
              style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
            >
              <SkipForward size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); controls.handleRestart() }}
              style={({ hovered }) => [styles.controlButton, hovered && styles.controlButtonHovered]}
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
          <Text style={styles.timeText}>
            {controls.formatTime(state.currentTime)} / {controls.formatTime(state.duration)}
          </Text>
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
          >
            <List size={18} color={showChaptersPanel ? colors.primary : colors.text} />
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
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
})
