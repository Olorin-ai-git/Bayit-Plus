/**
 * WizardStepSelectSource - Step 2: Source selection
 * Displays list of available sources for the selected content type
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { ChevronRight, AlertCircle, ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

// Zod schema for prop validation
const SourceSchema = z.object({
  name: z.string(),
  description: z.string(),
  items: z.array(z.any()),
})

const WizardStepSelectSourcePropsSchema = z.object({
  sources: z.record(z.string(), SourceSchema),
  currentSourceType: z.object({
    id: z.string(),
    label: z.string(),
  }).nullable(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onSelectSource: z.function().args(z.string()).returns(z.void()),
  onBack: z.function().args().returns(z.void()),
})

type WizardStepSelectSourceProps = z.infer<typeof WizardStepSelectSourcePropsSchema>

export function WizardStepSelectSource({
  sources,
  currentSourceType,
  isLoading,
  error,
  onSelectSource,
  onBack,
}: WizardStepSelectSourceProps) {
  if (!currentSourceType) {
    return null
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={16} color="#9333ea" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>
        Select a source for {currentSourceType.label.toLowerCase()}
      </Text>

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#9333ea" />
          <Text style={styles.loadingText}>Loading sources...</Text>
        </View>
      ) : error ? (
        /* Error state */
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        /* Sources list */
        <View style={styles.sourcesList}>
          {Object.entries(sources).map(([key, source]) => (
            <Pressable
              key={key}
              onPress={() => onSelectSource(key)}
              style={styles.sourceItem}
            >
              <View style={styles.sourceContent}>
                <Text style={styles.sourceName}>{source.name}</Text>
                <Text style={styles.sourceDescription}>{source.description}</Text>
                <Text style={styles.sourceItemCount}>
                  {source.items.length} items available
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: fontSize.sm,
    color: '#9333ea',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#ef4444',
  },
  sourcesList: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  sourceContent: {
    flex: 1,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sourceDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
  sourceItemCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
})
