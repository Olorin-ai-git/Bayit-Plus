import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { GlassButton } from './GlassButton'
import { colors, typography, spacing } from '../../theme'

interface ErrorViewProps {
  message: string
  onRetry?: () => void
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <GlassButton
          title="Retry"
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.xl,
  },
})
