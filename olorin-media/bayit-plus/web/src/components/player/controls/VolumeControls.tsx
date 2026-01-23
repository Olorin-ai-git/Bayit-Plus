/**
 * VolumeControls Component
 * Volume control with mute toggle and slider
 *
 * Features:
 * - Mute/unmute toggle button
 * - Volume slider (0.0 - 1.0) using GlassSlider
 * - Cross-platform support (web, iOS, tvOS, Android)
 */

import { View, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX } from 'lucide-react'
import { colors, borderRadius } from '@bayit/shared/theme'
import { GlassSlider } from '@bayit/shared/ui'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'

interface VolumeControlsProps {
  isMuted: boolean
  volume: number
  onToggleMute: () => void
  onVolumeChange: (value: number) => void
}

export default function VolumeControls({
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
}: VolumeControlsProps) {
  const { t } = useTranslation()
  const muteFocus = useTVFocus({ styleType: 'button' })
  const smallIconSize = isTV ? 24 : 18

  return (
    <View style={styles.container}>
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onToggleMute() }}
        onFocus={muteFocus.handleFocus}
        onBlur={muteFocus.handleBlur}
        focusable={true}
        style={[styles.muteButton, muteFocus.isFocused && muteFocus.focusStyle]}
        accessibilityLabel={isMuted ? t('player.unmute') : t('player.mute')}
        accessibilityRole="button"
      >
        {isMuted ? (
          <VolumeX size={smallIconSize} color={colors.text} />
        ) : (
          <Volume2 size={smallIconSize} color={colors.text} />
        )}
      </Pressable>
      <View style={styles.sliderContainer}>
        <GlassSlider
          value={isMuted ? 0 : volume}
          min={0}
          max={1}
          step={0.1}
          onValueChange={onVolumeChange}
          accessibilityLabel={t('player.volume')}
          testID="volume-slider"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  muteButton: {
    width: isTV ? 56 : 36,
    height: isTV ? 56 : 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    width: isTV ? 120 : 80,
  },
})
