/**
 * LiveFeatureButton Component
 * Wraps GlassLiveControlButton for live AI panel toggle features
 * (Live Chat, Live Trivia, etc.) with consistent styling and pulsing green dot.
 */

import { ReactNode } from 'react'
import { GlassLiveControlButton } from './GlassLiveControlButton'

interface LiveFeatureButtonProps {
  label: string
  icon: ReactNode
  isActive?: boolean
  onPress: () => void
}

export default function LiveFeatureButton({
  label,
  icon,
  isActive = false,
  onPress,
}: LiveFeatureButtonProps) {
  return (
    <GlassLiveControlButton
      icon={icon}
      label={label}
      isEnabled={isActive}
      isPremium={true}
      onPress={onPress}
    />
  )
}
