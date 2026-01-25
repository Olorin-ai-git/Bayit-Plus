/**
 * Cast Button Component
 * Allows users to cast video to AirPlay or Chromecast devices
 */

import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Cast } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { CastSession } from '../types/cast'
import { controlStyles as styles } from './playerControlsStyles'

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

  // Hide button if cast not available
  if (!castSession.isAvailable) {
    return null
  }

  const smallIconSize = isTV ? 24 : 18

  const handlePress = (e: any) => {
    e.stopPropagation?.()

    if (castSession.isConnected) {
      // If connected, show disconnect option via picker/dialog
      castSession.stopCast()
    } else {
      // Start cast session
      castSession.startCast()
    }
  }

  const handleHoverIn = () => {
    onHoveredButtonChange?.('cast')
  }

  const handleHoverOut = () => {
    onHoveredButtonChange?.(null)
  }

  // Accessibility label
  const accessibilityLabel = castSession.isConnected
    ? t('player.cast.connected', { device: castSession.deviceName })
    : t('player.cast.start')

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={tvFocus.handleFocus}
      onBlur={tvFocus.handleBlur}
      focusable={true}
      style={({ hovered }) => [
        styles.controlButton,
        hovered && styles.controlButtonHovered,
        castSession.isConnected && styles.controlButtonActive,
        tvFocus.isFocused && tvFocus.focusStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        selected: castSession.isConnected,
        busy: castSession.isConnecting,
      }}
    >
      <Cast
        size={smallIconSize}
        color={castSession.isConnected ? colors.primary : colors.text}
      />
    </Pressable>
  )
}
