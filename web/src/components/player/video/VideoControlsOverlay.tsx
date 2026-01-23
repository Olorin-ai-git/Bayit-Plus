/**
 * VideoControlsOverlay - Bottom controls with progress bar and player controls
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View } from 'react-native'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { platformClass } from '@/utils/platformClass'
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
      className={platformClass(
        showControls
          ? 'absolute inset-0 bg-gradient-to-t from-[rgba(17,17,34,0.9)] via-transparent to-[rgba(17,17,34,0.4)] opacity-100 transition-opacity'
          : 'absolute inset-0 bg-gradient-to-t from-[rgba(17,17,34,0.9)] via-transparent to-[rgba(17,17,34,0.4)] opacity-0 transition-opacity pointer-events-none',
        showControls
          ? 'absolute inset-0 opacity-100'
          : 'absolute inset-0 opacity-0'
      )}
      pointerEvents={showControls ? 'auto' : 'none'}
    >
      {/* Bottom Controls */}
      <GlassView
        className={platformClass(
          'absolute bottom-0 left-0 right-0 p-4 gap-2 rounded-b-2xl',
          'absolute bottom-0 left-0 right-0 p-4 gap-2'
        )}
        intensity="high"
        noBorder
      >
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
