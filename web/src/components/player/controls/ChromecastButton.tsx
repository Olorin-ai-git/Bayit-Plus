/**
 * Chromecast Button Component
 * Allows users to cast video to Chromecast devices
 * Shows Google Chromecast icon
 */

import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Cast } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { controlStyles as styles } from './playerControlsStyles'

interface ChromecastSession {
  isAvailable: boolean
  isConnecting: boolean
  isConnected: boolean
  deviceName: string | null
  startCast: () => void
  stopCast: () => void
}

interface ChromecastButtonProps {
  session: ChromecastSession
  onHoveredButtonChange?: (button: string | null) => void
}

export default function ChromecastButton({
  session,
  onHoveredButtonChange,
}: ChromecastButtonProps) {
  const { t } = useTranslation()
  const tvFocus = useTVFocus({ styleType: 'button' })

  const iconSize = isTV ? 24 : 18
  const isDisabled = !session.isAvailable

  const handlePress = (e: any) => {
    e.stopPropagation?.()
    if (isDisabled || session.isConnecting) return

    if (session.isConnected) {
      session.stopCast()
    } else {
      session.startCast()
    }
  }

  const handleHoverIn = () => {
    if (!isDisabled) {
      onHoveredButtonChange?.('chromecast')
    }
  }

  const handleHoverOut = () => {
    onHoveredButtonChange?.(null)
  }

  const accessibilityLabel = session.isConnected
    ? t('player.chromecast.connected', { device: session.deviceName })
    : session.isConnecting
    ? t('player.chromecast.connecting', 'Connecting...')
    : isDisabled
    ? t('player.chromecast.unavailable', 'Chromecast Unavailable')
    : t('player.chromecast.start', 'Chromecast')

  const title = isDisabled
    ? t('player.chromecast.noDevices', 'No Chromecast devices found')
    : session.isConnecting
    ? t('player.chromecast.connecting', 'Connecting to Chromecast...')
    : session.isConnected
    ? t('player.chromecast.connectedTo', `Connected to ${session.deviceName}`)
    : t('player.chromecast.start', 'Chromecast')

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={!isDisabled ? tvFocus.handleFocus : undefined}
      onBlur={!isDisabled ? tvFocus.handleBlur : undefined}
      focusable={!isDisabled && !session.isConnecting}
      disabled={isDisabled || session.isConnecting}
      style={({ hovered }) => [
        styles.controlButton,
        !isDisabled && hovered && styles.controlButtonHovered,
        session.isConnected && styles.controlButtonActive,
        !isDisabled && tvFocus.isFocused && tvFocus.focusStyle,
        (isDisabled || session.isConnecting) && { opacity: 0.4, cursor: 'not-allowed' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: isDisabled,
        selected: session.isConnected,
        busy: session.isConnecting,
      }}
      // @ts-ignore - title prop for web tooltip
      title={title}
    >
      <Cast
        size={iconSize}
        color={
          isDisabled
            ? colors.textDisabled
            : session.isConnecting
            ? colors.warning
            : session.isConnected
            ? colors.primary
            : colors.text
        }
      />
    </Pressable>
  )
}
