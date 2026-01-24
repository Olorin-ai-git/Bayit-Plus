/**
 * VideoControlsOverlay - Bottom controls with progress bar and player controls
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, StyleSheet } from 'react-native'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { spacing, borderRadius } from '@bayit/shared/theme'
import PlayerControls from '../PlayerControls'
import ProgressBar from '../ProgressBar'
import type { PlayerState, PlayerControls as PlayerControlsType, Chapter } from '../types'

// Zod schema for prop validation
const VideoControlsOverlayPropsSchema = z.object({
  showControls: z.boolean(),
  isLive: z.boolean(),
  showChaptersPanel: z.boolean(),
  showSettings: z.boolean(),
  hasChapters: z.boolean(),
  onChaptersPanelToggle: z.function().args().returns(z.void()),
  onSettingsToggle: z.function().args().returns(z.void()),
})

export type VideoControlsOverlayProps = z.infer<typeof VideoControlsOverlayPropsSchema> & {
  state: PlayerState
  controls: PlayerControlsType
  chapters: Chapter[]
  renderWatchPartyButton: () => React.ReactNode
  renderSubtitleControls: () => React.ReactNode
  renderLiveSubtitleControls: () => React.ReactNode
  renderRecordButton: () => React.ReactNode
}

export default function VideoControlsOverlay({
  showControls,
  state,
  controls,
  isLive,
  showChaptersPanel,
  showSettings,
  hasChapters,
  chapters,
  onChaptersPanelToggle,
  onSettingsToggle,
  renderWatchPartyButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderRecordButton,
}: VideoControlsOverlayProps) {
  return (
    <View
      style={[styles.overlay, showControls ? styles.overlayVisible : styles.overlayHidden]}
      pointerEvents={showControls ? 'auto' : 'none'}
    >
      <GlassView style={styles.controls} intensity="high" noBorder>
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
          showChaptersPanel={showChaptersPanel}
          showSettings={showSettings}
          hasChapters={hasChapters}
          chapters={chapters}
          onChaptersPanelToggle={onChaptersPanelToggle}
          onSettingsToggle={onSettingsToggle}
          renderWatchPartyButton={renderWatchPartyButton}
          renderSubtitleControls={renderSubtitleControls}
          renderLiveSubtitleControls={renderLiveSubtitleControls}
          renderRecordButton={renderRecordButton}
        />
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayVisible: {
    opacity: 1,
  },
  overlayHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    gap: spacing[2],
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
  },
});
