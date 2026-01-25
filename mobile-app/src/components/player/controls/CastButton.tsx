/**
 * Cast Button (Mobile)
 * Shows cast button for AirPlay and Chromecast
 */

import React from 'react'
import { Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { Cast } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '@olorin/design-tokens'
import { CastSession } from '../types/cast'

interface CastButtonProps {
  castSession: CastSession
  size?: number
  color?: string
  activeColor?: string
}

export default function CastButton({
  castSession,
  size = 24,
  color = colors.text,
  activeColor = colors.primary[500],
}: CastButtonProps) {
  const { t } = useTranslation()
  if (!castSession.isAvailable) {
    return null
  }

  const handlePress = () => {
    if (castSession.isConnected) {
      castSession.stopCast()
    } else {
      castSession.startCast()
    }
  }

  const iconColor = castSession.isConnected ? activeColor : color

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        castSession.isConnected
          ? t('player.cast.connected', { device: castSession.deviceName })
          : t('player.cast.start')
      }
    >
      {castSession.isConnecting ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Cast size={size} color={iconColor} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
})
