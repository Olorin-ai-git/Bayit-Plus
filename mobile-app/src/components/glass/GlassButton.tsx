import React from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { colors, typography, spacing } from '../../theme'

interface GlassButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style
}: GlassButtonProps) {
  const gradientColors = variant === 'primary'
    ? [colors.primary, colors.primaryDark]
    : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  gradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.labelLarge,
    color: colors.text,
    textAlign: 'center',
  },
})
