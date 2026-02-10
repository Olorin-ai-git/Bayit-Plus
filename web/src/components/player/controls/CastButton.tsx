/**
 * Cast Button Component
 * Allows users to cast video to AirPlay or Chromecast devices
 * Always visible - disabled with tooltip when no devices available
 */

import { Pressable, View, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Cast } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { CastSession } from '../types/cast'
import { controlStyles as styles } from './playerControlsStyles'
import { castConfig } from '@/config/castConfig'

interface CastButtonProps {
  castSession: CastSession
  onHoveredButtonChange?: (button: string | null) => void
}

export default function CastButton({
  castSession,
  onHoveredButtonChange,
}: CastButtonProps) {
  const { t } = useTranslation()
  const tvFocus = useTVFocus({ styleType: 'button' })

  // Don't render if cast feature is not configured
  if (!castConfig.featureEnabled) {
    return null
  }

  const iconSize = isTV ? 24 : 18
  const isDisabled = !castSession.isAvailable

  const handlePress = (e: any) => {
    e.stopPropagation?.()

    // Ignore clicks when disabled
    if (isDisabled) {
      return
    }

    if (castSession.isConnected) {
      // If connected, disconnect
      castSession.stopCast()
    } else {
      // Start cast session
      castSession.startCast()
    }
  }

  const handleHoverIn = () => {
    if (!isDisabled) {
      onHoveredButtonChange?.('cast')
    }
  }

  const handleHoverOut = () => {
    onHoveredButtonChange?.(null)
  }

  // Accessibility labels and hints
  const accessibilityLabel = castSession.isConnected
    ? t('player.cast.connected', { device: castSession.deviceName })
    : isDisabled
    ? t('player.cast.unavailable', 'Cast Unavailable')
    : t('player.cast.start', 'Cast')

  const accessibilityHint = isDisabled
    ? t('player.cast.noDevices', 'No AirPlay or Chromecast devices found')
    : castSession.isConnected
    ? t('player.cast.disconnect', 'Tap to disconnect')
    : t('player.cast.hint', 'Tap to cast to a device')

  // Tooltip (web only)
  const title = isDisabled
    ? t('player.cast.noDevices', 'No AirPlay or Chromecast devices found')
    : castSession.isConnected
    ? t('player.cast.connectedTo', `Connected to ${castSession.deviceName}`)
    : t('player.cast.start', 'Cast')

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={!isDisabled ? tvFocus.handleFocus : undefined}
      onBlur={!isDisabled ? tvFocus.handleBlur : undefined}
      focusable={!isDisabled}
      disabled={isDisabled}
      style={({ hovered }) => [
        styles.controlButton,
        !isDisabled && hovered && styles.controlButtonHovered,
        castSession.isConnected && styles.controlButtonActive,
        !isDisabled && tvFocus.isFocused && tvFocus.focusStyle,
        isDisabled && { opacity: 0.4, cursor: 'not-allowed' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        selected: castSession.isConnected,
        busy: castSession.isConnecting,
      }}
      // @ts-ignore - title prop for web tooltip
      title={Platform.OS === 'web' ? title : undefined}
    >
      <Cast
        size={iconSize}
        color={
          isDisabled
            ? colors.textDisabled
            : castSession.isConnected
            ? colors.primary.DEFAULT
            : colors.text
        }
      />
    </Pressable>
  )
}
