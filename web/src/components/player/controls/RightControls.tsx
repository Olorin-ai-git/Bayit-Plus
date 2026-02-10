/**
 * RightControls Component
 * Action buttons for chapters, search, settings, fullscreen with TV focus support
 * For live channels, uses the GlassLiveControlsPanel for Language Settings
 */

import { View, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { List, Search, Settings, Maximize, Minimize } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { useResponsive } from '@/hooks/useResponsive'
import { useDirection } from '@/hooks/useDirection'
import { PlayerState } from '../types'
import {
  controlStyles as styles,
  MIN_TOUCH_TARGET,
  MOBILE_TOUCH_TARGET,
  TV_TOUCH_TARGET,
} from './playerControlsStyles'
import { GlassLiveControlsPanel } from './GlassLiveControlsPanel'

interface RightControlsProps {
  state: PlayerState
  toggleFullscreen: () => void
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
  onChaptersPanelToggle?: () => void
  onSceneSearchToggle?: () => void
  onSettingsToggle?: () => void
  renderWatchPartyButton?: () => React.ReactNode
  renderCastButton?: () => React.ReactNode
  renderAirPlayButton?: () => React.ReactNode
  renderChromecastButton?: () => React.ReactNode
  renderPiPButton?: () => React.ReactNode
  renderSubtitleControls?: () => React.ReactNode
  renderLiveSubtitleControls?: () => React.ReactNode
  renderLiveSplitSubtitleControls?: () => React.ReactNode
  renderDubbingControls?: () => React.ReactNode
  renderRecordButton?: () => React.ReactNode
  renderChannelChatButton?: () => React.ReactNode
  renderLiveTriviaButton?: () => React.ReactNode
  renderCatchUpButton?: () => React.ReactNode
  liveFeatureError?: string | null
  onDismissLiveFeatureError?: () => void
}

export default function RightControls({
  state,
  toggleFullscreen,
  isLive = false,
  liveSubtitleLang = 'en',
  availableLanguages = ['en', 'es', 'he', 'ar', 'ru', 'fr'],
  onLanguageChange = () => {},
  isDubbingActive = false,
  showChaptersPanel = false,
  showSceneSearchPanel = false,
  showSettings = false,
  hasChapters = false,
  hasSceneSearch = false,
  onChaptersPanelToggle,
  onSceneSearchToggle,
  onSettingsToggle,
  renderWatchPartyButton,
  renderCastButton,
  renderAirPlayButton,
  renderChromecastButton,
  renderPiPButton,
  renderSubtitleControls,
  renderLiveSubtitleControls,
  renderLiveSplitSubtitleControls,
  renderDubbingControls,
  renderRecordButton,
  renderChannelChatButton,
  renderLiveTriviaButton,
  renderCatchUpButton,
  liveFeatureError,
  onDismissLiveFeatureError,
}: RightControlsProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const responsive = useResponsive()
  const chaptersFocus = useTVFocus({ styleType: 'button' })
  const searchFocus = useTVFocus({ styleType: 'button' })
  const settingsFocus = useTVFocus({ styleType: 'button' })
  const fullscreenFocus = useTVFocus({ styleType: 'button' })

  // Mobile-responsive button and icon sizes
  const buttonSize = isTV ? TV_TOUCH_TARGET : (responsive.isMobile ? MOBILE_TOUCH_TARGET : MIN_TOUCH_TARGET)
  const smallIconSize = isTV ? 24 : (responsive.isMobile ? 24 : 18)

  // Mobile-responsive button style
  const mobileButtonStyle = responsive.isMobile ? {
    width: buttonSize,
    height: buttonSize,
  } : {}

  const isLiveWithPanel = isLive && onSettingsToggle && renderLiveSubtitleControls && renderDubbingControls

  if (isLiveWithPanel) {
    return (
      <View style={[styles.rightControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {renderWatchPartyButton && renderWatchPartyButton()}
        {renderAirPlayButton && renderAirPlayButton()}
        {renderChromecastButton && renderChromecastButton()}
        {renderPiPButton && renderPiPButton()}
        {renderRecordButton && renderRecordButton()}

        {/* Glass Live AI Panel (all AI features inside) */}
        <GlassLiveControlsPanel
          isExpanded={showSettings}
          onToggleExpand={onSettingsToggle}
          currentLanguage={liveSubtitleLang}
          availableLanguages={availableLanguages}
          onLanguageChange={onLanguageChange}
          isFullscreen={state.isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isDubbingActive={isDubbingActive}
          renderLiveSubtitleControls={renderLiveSubtitleControls}
          renderLiveSplitSubtitleControls={renderLiveSplitSubtitleControls}
          renderDubbingControls={renderDubbingControls}
          renderCatchUpButton={renderCatchUpButton}
          renderChannelChatButton={!responsive.isMobile ? renderChannelChatButton : undefined}
          renderLiveTriviaButton={!responsive.isMobile ? renderLiveTriviaButton : undefined}
          error={liveFeatureError}
          onDismissError={onDismissLiveFeatureError}
        />
      </View>
    )
  }

  return (
    <View style={[styles.rightControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {renderWatchPartyButton && renderWatchPartyButton()}
      {renderAirPlayButton && renderAirPlayButton()}
      {renderChromecastButton && renderChromecastButton()}

      {/* Chapters - hidden on mobile */}
      {!responsive.isMobile && !isLive && hasChapters && onChaptersPanelToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onChaptersPanelToggle()
          }}
          onFocus={chaptersFocus.handleFocus}
          onBlur={chaptersFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton,
            mobileButtonStyle,
            hovered && styles.controlButtonHovered,
            showChaptersPanel && styles.controlButtonActive,
            chaptersFocus.isFocused && chaptersFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.chapters')}
          accessibilityState={{ expanded: showChaptersPanel }}
        >
          <List
            size={smallIconSize}
            color={showChaptersPanel ? colors.primary.DEFAULT : colors.text}
          />
        </Pressable>
      )}

      {/* Scene Search - hidden on mobile */}
      {!responsive.isMobile && hasSceneSearch && onSceneSearchToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSceneSearchToggle()
          }}
          onFocus={searchFocus.handleFocus}
          onBlur={searchFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton,
            mobileButtonStyle,
            hovered && styles.controlButtonHovered,
            showSceneSearchPanel && styles.controlButtonActive,
            searchFocus.isFocused && searchFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.sceneSearch.title')}
          accessibilityState={{ expanded: showSceneSearchPanel }}
        >
          <Search
            size={smallIconSize}
            color={showSceneSearchPanel ? colors.primary.DEFAULT : colors.text}
          />
        </Pressable>
      )}

      {renderSubtitleControls && renderSubtitleControls()}
      {!responsive.isMobile && renderRecordButton && renderRecordButton()}

      {/* Channel Chat button for VOD - hidden on mobile */}
      {!responsive.isMobile && renderChannelChatButton && renderChannelChatButton()}

      {/* Regular Settings button for VOD */}
      {onSettingsToggle && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.()
            onSettingsToggle()
          }}
          onFocus={settingsFocus.handleFocus}
          onBlur={settingsFocus.handleBlur}
          focusable={true}
          style={({ hovered }) => [
            styles.controlButton,
            mobileButtonStyle,
            hovered && styles.controlButtonHovered,
            showSettings && styles.controlButtonActive,
            settingsFocus.isFocused && settingsFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('player.settings')}
          accessibilityState={{ expanded: showSettings }}
        >
          <Settings
            size={smallIconSize}
            color={showSettings ? colors.primary.DEFAULT : colors.text}
          />
        </Pressable>
      )}

      {/* Picture-in-Picture */}
      {renderPiPButton && renderPiPButton()}

      {/* Fullscreen for VOD */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          toggleFullscreen()
        }}
        onFocus={fullscreenFocus.handleFocus}
        onBlur={fullscreenFocus.handleBlur}
        focusable={true}
        style={({ hovered }) => [
          styles.controlButton,
          mobileButtonStyle,
          hovered && styles.controlButtonHovered,
          fullscreenFocus.isFocused && fullscreenFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          state.isFullscreen
            ? t('player.exitFullscreen')
            : t('player.enterFullscreen')
        }
      >
        {state.isFullscreen ? (
          <Minimize size={smallIconSize} color={colors.text} />
        ) : (
          <Maximize size={smallIconSize} color={colors.text} />
        )}
      </Pressable>
    </View>
  )
}
