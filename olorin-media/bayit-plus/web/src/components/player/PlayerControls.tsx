/**
 * PlayerControls Component
 * Main control bar with play/pause, skip, volume, and action buttons
 */

import { View } from 'react-native'
import { isTV } from '@bayit/shared/utils/platform'
import { PlayerState, PlayerControls as PlayerControlsType, Chapter } from './types'
import { LeftControls, RightControls, controlStyles as styles } from './controls'

interface PlayerControlsProps {
  state: PlayerState
  controls: PlayerControlsType
  isLive?: boolean
  liveSubtitleLang?: string
  availableLanguages?: string[]
  onLanguageChange?: (lang: string) => void
  isDubbingActive?: boolean
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
  renderDubbingControls?: () => React.ReactNode
  renderRecordButton?: () => React.ReactNode
  renderCastButton?: () => React.ReactNode
}

export default function PlayerControls({
  state,
  controls,
  isLive = false,
  liveSubtitleLang = 'en',
  availableLanguages,
  onLanguageChange,
  isDubbingActive = false,
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
  renderDubbingControls,
  renderRecordButton,
  renderCastButton,
}: PlayerControlsProps) {
  return (
    <View style={styles.controlsRow}>
      <LeftControls
        state={state}
        controls={controls}
        isLive={isLive}
        hasChapters={hasChapters}
        chapters={chapters}
      />
      <RightControls
        state={state}
        toggleFullscreen={controls.toggleFullscreen}
        isLive={isLive}
        liveSubtitleLang={liveSubtitleLang}
        availableLanguages={availableLanguages}
        onLanguageChange={onLanguageChange}
        isDubbingActive={isDubbingActive}
        showChaptersPanel={showChaptersPanel}
        showSceneSearchPanel={showSceneSearchPanel}
        showSettings={showSettings}
        hasChapters={hasChapters}
        hasSceneSearch={hasSceneSearch}
        onChaptersPanelToggle={onChaptersPanelToggle}
        onSceneSearchToggle={onSceneSearchToggle}
        onSettingsToggle={onSettingsToggle}
        renderWatchPartyButton={renderWatchPartyButton}
        renderCastButton={renderCastButton}
        renderSubtitleControls={renderSubtitleControls}
        renderLiveSubtitleControls={renderLiveSubtitleControls}
        renderDubbingControls={renderDubbingControls}
        renderRecordButton={renderRecordButton}
      />
    </View>
  )
}
