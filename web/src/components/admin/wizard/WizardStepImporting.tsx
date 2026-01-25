/**
 * WizardStepImporting - Step 5: Progress indicator
 * Displays import progress and completion status
 */

import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { CheckCircle } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, fontSize } from '@olorin/design-tokens'

// Zod schema for prop validation
const WizardStepImportingPropsSchema = z.object({
  progress: z.number(),
})

type WizardStepImportingProps = z.infer<typeof WizardStepImportingPropsSchema>

export function WizardStepImporting({ progress }: WizardStepImportingProps) {
  const isComplete = progress === 100

  return (
    <View style={styles.container}>
      {isComplete ? (
        <>
          <CheckCircle size={64} color="#22c55e" />
          <Text style={styles.title}>Import Complete!</Text>
          <Text style={styles.subtitle}>
            Your content has been successfully imported to the library.
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.title}>Importing Content...</Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressText}>{progress}% complete</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 96,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9333ea',
  },
  progressText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
})
