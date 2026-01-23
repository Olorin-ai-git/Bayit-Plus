/**
 * RightControls Component
 * Action buttons for chapters, search, settings, fullscreen with TV focus support
 */

import { View, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { List, Search, Settings, Maximize, Minimize } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { PlayerState } from '../types'
import { controlStyles as styles } from './playerControlsStyles'

interface RightControlsProps {
  state: PlayerState
  toggleFullscreen: () => void
  isLive?: boolean
  showChaptersPanel?: boolean
  showSceneSearchPanel?: boolean
  showSettings?: boolean
  hasChapters?: boolean
  hasSceneSearch?: boolean
  onChaptersPanelToggle?: () => void
  onSceneSearchToggle?: () => void
  onSettingsToggle?: () => void
  renderWatchPartyButton?: () => React.ReactNode
  renderSubtitleControls?: () => React.ReactNode
  renderLiveSubtitleControls?: () => React.ReactNode
  renderDubbingControls?: () => React.ReactNode
  renderRecordButton?: () => React.ReactNode
}

export default function RightControls({
  state, toggleFullscreen, isLive = false,
  showChaptersPanel = false, showSceneSearchPanel = false, showSettings = false,
  hasChapters = false, hasSceneSearch = false,
  onChaptersPanelToggle, onSceneSearchToggle, onSettingsToggle,
  renderWatchPartyButton, renderSubtitleControls, renderLiveSubtitleControls,
  renderDubbingControls, renderRecordButton,
}: RightControlsProps) {
  const { t } = useTranslation()
  const chaptersFocus = useTVFocus({ styleType: 'button' })
  const searchFocus = useTVFocus({ styleType: 'button' })
  const settingsFocus = useTVFocus({ styleType: 'button' })
  const fullscreenFocus = useTVFocus({ styleType: 'button' })

  const smallIconSize = isTV ? 24 : 18

  return (
    <View style={styles.rightControls}>
      {renderWatchPartyButton && renderWatchPartyButton()}

      {/* Chapters */}
      {!isLive && hasChapters && onChaptersPanelToggle && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onChaptersPanelToggle() }}
          onFocus={chaptersFocus.handleFocus}
          onBlur={chaptersFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton, hovered && styles.controlButtonHovered,
            showChaptersPanel && styles.controlButtonActive,
            chaptersFocus.isFocused && chaptersFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.chapters')}
          accessibilityState={{ expanded: showChaptersPanel }}
        >
          <List size={smallIconSize} color={showChaptersPanel ? colors.primary : colors.text} />
        </Pressable>
      )}

      {/* Scene Search */}
      {hasSceneSearch && onSceneSearchToggle && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onSceneSearchToggle() }}
          onFocus={searchFocus.handleFocus}
          onBlur={searchFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton, hovered && styles.controlButtonHovered,
            showSceneSearchPanel && styles.controlButtonActive,
            searchFocus.isFocused && searchFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.sceneSearch.title')}
          accessibilityState={{ expanded: showSceneSearchPanel }}
        >
          <Search size={smallIconSize} color={showSceneSearchPanel ? colors.primary : colors.text} />
        </Pressable>
      )}

      {renderSubtitleControls && renderSubtitleControls()}
      {renderLiveSubtitleControls && renderLiveSubtitleControls()}
      {renderDubbingControls && renderDubbingControls()}
      {renderRecordButton && renderRecordButton()}

      {/* Settings */}
      {onSettingsToggle && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onSettingsToggle() }}
          onFocus={settingsFocus.handleFocus}
          onBlur={settingsFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton, hovered && styles.controlButtonHovered,
            showSettings && styles.controlButtonActive,
            settingsFocus.isFocused && settingsFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.settings')}
          accessibilityState={{ expanded: showSettings }}
        >
          <Settings size={smallIconSize} color={showSettings ? colors.primary : colors.text} />
        </Pressable>
      )}

      {/* Fullscreen */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); toggleFullscreen() }}
        onFocus={fullscreenFocus.handleFocus}
        onBlur={fullscreenFocus.handleBlur}
        focusable={true}
        style={({ hovered }) => [
          styles.controlButton, hovered && styles.controlButtonHovered,
          fullscreenFocus.isFocused && fullscreenFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={state.isFullscreen ? t('player.exitFullscreen') : t('player.enterFullscreen')}
      >
        {state.isFullscreen ? <Minimize size={smallIconSize} color={colors.text} /> : <Maximize size={smallIconSize} color={colors.text} />}
      </Pressable>
    </View>
  )
}
