/**
 * AirPlay Button Component
 * Allows users to cast video to AirPlay devices (Apple TV, HomePod, etc.)
 * Shows Apple-style AirPlay icon
 */

import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Airplay } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { controlStyles as styles } from './playerControlsStyles'

interface AirPlaySession {
  isAvailable: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
}

interface AirPlayButtonProps {
  session: AirPlaySession
  onHoveredButtonChange?: (button: string | null) => void
}

export default function AirPlayButton({
  session,
  onHoveredButtonChange,
}: AirPlayButtonProps) {
  const { t } = useTranslation()
  const tvFocus = useTVFocus({ styleType: 'button' })

  const iconSize = isTV ? 24 : 18
  const isDisabled = !session.isAvailable

  const handlePress = (e: any) => {
    e.stopPropagation?.()
    if (isDisabled) return

    if (session.isConnected) {
      session.stopCast()
    } else {
      session.startCast()
    }
  }

  const handleHoverIn = () => {
    if (!isDisabled) {
      onHoveredButtonChange?.('airplay')
    }
  }

  const handleHoverOut = () => {
    onHoveredButtonChange?.(null)
  }

  const accessibilityLabel = session.isConnected
    ? t('player.airplay.connected', { device: session.deviceName })
    : isDisabled
    ? t('player.airplay.unavailable', 'AirPlay Unavailable')
    : t('player.airplay.start', 'AirPlay')

  const title = isDisabled
    ? t('player.airplay.noDevices', 'No AirPlay devices found')
    : session.isConnected
    ? t('player.airplay.connectedTo', `Connected to ${session.deviceName}`)
    : t('player.airplay.start', 'AirPlay')

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
        session.isConnected && styles.controlButtonActive,
        !isDisabled && tvFocus.isFocused && tvFocus.focusStyle,
        isDisabled && { opacity: 0.4, cursor: 'not-allowed' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: isDisabled,
        selected: session.isConnected,
      }}
      // @ts-ignore - title prop for web tooltip
      title={title}
    >
      <Airplay
        size={iconSize}
        color={
          isDisabled
            ? colors.textDisabled
            : session.isConnected
            ? colors.primary.DEFAULT
            : colors.text
        }
      />
    </Pressable>
  )
}
