/**
 * WizardStepConfirm - Step 4: Confirmation screen
 * Displays import summary and confirmation before executing
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme'

// Zod schema for prop validation
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
})

const SourceSchema = z.object({
  name: z.string(),
})

const WizardStepConfirmPropsSchema = z.object({
  sourceType: z.string(),
  sourceName: z.string().optional(),
  categoryId: z.string().optional(),
  categories: z.array(CategorySchema),
  currentSource: SourceSchema.nullable(),
  selectedItemsCount: z.number(),
  importAll: z.boolean(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onImport: z.function().args().returns(z.void()),
  onBack: z.function().args().returns(z.void()),
})

type WizardStepConfirmProps = z.infer<typeof WizardStepConfirmPropsSchema>

export function WizardStepConfirm({
  sourceType,
  sourceName,
  categoryId,
  categories,
  currentSource,
  selectedItemsCount,
  importAll,
  isLoading,
  error,
  onImport,
  onBack,
}: WizardStepConfirmProps) {
  if (!currentSource) {
    return null
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={16} color="#9333ea" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Ready to import?</Text>

      {/* Confirmation box */}
      <View style={styles.confirmBox}>
        <Text style={styles.confirmText}>
          You are about to import {importAll ? 'all' : selectedItemsCount} item(s) from{' '}
          <Text style={styles.sourceName}>{currentSource.name}</Text>.
        </Text>

        {sourceType === 'vod' && selectedCategory && (
          <Text style={styles.categoryText}>
            Category: <Text style={styles.categoryName}>{selectedCategory.name}</Text>
          </Text>
        )}

        {/* Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.noteText}>• Items will be added to your content library</Text>
          <Text style={styles.noteText}>• You can edit them after import</Text>
          <Text style={styles.noteText}>• This action cannot be undone</Text>
        </View>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <GlassButton
          title="Cancel"
          variant="secondary"
          onPress={onBack}
          disabled={isLoading}
          style={styles.actionButton}
        />
        <GlassButton
          title={isLoading ? 'Importing...' : 'Import Now'}
          variant="primary"
          onPress={onImport}
          disabled={isLoading}
          style={styles.actionButton}
        />
      </View>
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
  confirmBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  confirmText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sourceName: {
    fontWeight: '600',
    color: '#9333ea',
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontWeight: '600',
    color: '#9333ea',
  },
  notesContainer: {
    marginTop: spacing.md,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  noteText: {
    fontSize: 13,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
})
