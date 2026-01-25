/**
 * WizardStepSelectCategory - Step 2.5: Category selection (VOD only)
 * Displays list of categories for imported movies
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import { ChevronRight, AlertCircle, ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

// Zod schema for prop validation
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
})

const WizardStepSelectCategoryPropsSchema = z.object({
  categories: z.array(CategorySchema),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onSelectCategory: z.function().args(z.string()).returns(z.void()),
  onBack: z.function().args().returns(z.void()),
})

type WizardStepSelectCategoryProps = z.infer<typeof WizardStepSelectCategoryPropsSchema>

export function WizardStepSelectCategory({
  categories,
  isLoading,
  error,
  onSelectCategory,
  onBack,
}: WizardStepSelectCategoryProps) {
  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={16} color="#9333ea" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Select a category for imported movies</Text>

      <Text style={styles.subtitle}>
        Imported movies will be added to the selected category.
      </Text>

      {/* Loading state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#9333ea" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : error ? (
        /* Error state */
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : categories.length === 0 ? (
        /* No categories warning */
        <View style={styles.warningContainer}>
          <AlertCircle size={24} color="#eab308" />
          <Text style={styles.warningText}>
            No categories found. Please create a category first in the Categories section.
          </Text>
        </View>
      ) : (
        /* Categories list */
        <ScrollView style={styles.scrollView}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => onSelectCategory(category.id)}
              style={styles.categoryItem}
            >
              <View style={styles.categoryContent}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {category.description && (
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                )}
              </View>
              <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
            </Pressable>
          ))}
        </ScrollView>
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
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.md,
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
  warningContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  warningText: {
    fontSize: fontSize.sm,
    color: '#eab308',
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 250,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: spacing.sm,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
})
