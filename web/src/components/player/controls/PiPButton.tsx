/**
 * PiPButton Component
 * Toggles browser Picture-in-Picture mode for the video player
 */

import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { PictureInPicture2 } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { useResponsive } from '@/hooks/useResponsive'
import {
  controlStyles as styles,
  MIN_TOUCH_TARGET,
  MOBILE_TOUCH_TARGET,
  TV_TOUCH_TARGET,
} from './playerControlsStyles'
import type { UsePictureInPictureReturn } from '../hooks/usePictureInPicture'

interface PiPButtonProps {
  pip: UsePictureInPictureReturn
  onHoveredButtonChange?: (button: string | null) => void
}

export default function PiPButton({
  pip,
  onHoveredButtonChange,
}: PiPButtonProps) {
  const { t } = useTranslation()
  const responsive = useResponsive()
  const focus = useTVFocus({ styleType: 'button' })

  if (!pip.isSupported) return null

  const buttonSize = isTV ? TV_TOUCH_TARGET : (responsive.isMobile ? MOBILE_TOUCH_TARGET : MIN_TOUCH_TARGET)
  const iconSize = isTV ? 28 : (responsive.isMobile ? 20 : 22)

  const mobileButtonStyle = responsive.isMobile ? {
    width: buttonSize,
    height: buttonSize,
  } : {}

  const label = pip.isPiP
    ? t('player.exitPiP', 'Exit Picture-in-Picture')
    : t('player.enterPiP', 'Picture-in-Picture')

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.()
        pip.togglePiP()
      }}
      onFocus={focus.handleFocus}
      onBlur={focus.handleBlur}
      onHoverIn={() => onHoveredButtonChange?.('pip')}
      onHoverOut={() => onHoveredButtonChange?.(null)}
      focusable={true}
      style={({ hovered }) => [
        styles.controlButton,
        mobileButtonStyle,
        hovered && styles.controlButtonHovered,
        pip.isPiP && styles.controlButtonActive,
        focus.isFocused && focus.focusStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: pip.isPiP }}
    >
      <PictureInPicture2
        size={iconSize}
        color={pip.isPiP ? colors.primary : colors.text}
      />
    </Pressable>
  )
}
