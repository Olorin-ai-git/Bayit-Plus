import React from 'react'
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native'
import { colors, typography, spacing } from '../../theme'

interface GlassTextFieldProps extends TextInputProps {
  label?: string
  error?: string
}

export function GlassTextField({ label, error, style, ...props }: GlassTextFieldProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textSecondary}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  label: {
    ...typography.labelMedium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    ...typography.bodyMedium,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
})
