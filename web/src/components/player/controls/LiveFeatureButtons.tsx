/**
 * LiveFeatureButtons Component
 * Control buttons for live feature panels: Highlights, Search, Transcript Timeline
 */

import React from 'react'
import { Pressable, StyleSheet, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sparkles, Search, FileText } from 'lucide-react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassTooltip } from '@bayit/shared/ui'
import { isTV } from '@bayit/shared/utils/platform'
import type { LiveFeaturePanelType } from '../LiveFeaturesOverlay'

interface LiveFeatureButtonProps {
  type: LiveFeaturePanelType
  isActive: boolean
  onPress: () => void
  disabled?: boolean
}

const ICON_SIZE = isTV ? 22 : 18

export function LiveFeatureButton({
  type,
  isActive,
  onPress,
  disabled = false,
}: LiveFeatureButtonProps) {
  const { t } = useTranslation()

  const getIcon = () => {
    switch (type) {
      case 'highlights':
        return <Sparkles size={ICON_SIZE} color={isActive ? colors.warning.DEFAULT : colors.text} />
      case 'search':
        return <Search size={ICON_SIZE} color={isActive ? colors.primary.DEFAULT : colors.text} />
      case 'timeline':
        return <FileText size={ICON_SIZE} color={isActive ? colors.success.DEFAULT : colors.text} />
      default:
        return null
    }
  }

  const getLabel = () => {
    switch (type) {
      case 'highlights':
        return t('highlights.title', 'Live Highlights')
      case 'search':
        return t('search.liveTitle', 'Search Transcript')
      case 'timeline':
        return t('catchup.timeline.title', 'Live Transcript')
      default:
        return ''
    }
  }

  return (
    <GlassTooltip label={getLabel()}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        style={({ hovered, pressed }) => [
          styles.button,
          hovered && !disabled && styles.buttonHovered,
          pressed && !disabled && styles.buttonPressed,
          isActive && styles.buttonActive,
          disabled && styles.buttonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={getLabel()}
        accessibilityState={{ selected: isActive, disabled }}
      >
        {getIcon()}
      </Pressable>
    </GlassTooltip>
  )
}

interface LiveFeatureButtonsProps {
  activePanel: LiveFeaturePanelType
  onPanelChange: (panel: LiveFeaturePanelType) => void
  highlightsEnabled?: boolean
  searchEnabled?: boolean
  timelineEnabled?: boolean
}

export function LiveFeatureButtons({
  activePanel,
  onPanelChange,
  highlightsEnabled = true,
  searchEnabled = true,
  timelineEnabled = true,
}: LiveFeatureButtonsProps) {
  const handlePress = (panel: LiveFeaturePanelType) => {
    onPanelChange(activePanel === panel ? null : panel)
  }

  return (
    <>
      {highlightsEnabled && (
        <LiveFeatureButton
          type="highlights"
          isActive={activePanel === 'highlights'}
          onPress={() => handlePress('highlights')}
        />
      )}
      {searchEnabled && (
        <LiveFeatureButton
          type="search"
          isActive={activePanel === 'search'}
          onPress={() => handlePress('search')}
        />
      )}
      {timelineEnabled && (
        <LiveFeatureButton
          type="timeline"
          isActive={activePanel === 'timeline'}
          onPress={() => handlePress('timeline')}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    width: isTV ? 44 : 36,
    height: isTV ? 44 : 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
  },
  buttonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)',
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})

export default LiveFeatureButtons
