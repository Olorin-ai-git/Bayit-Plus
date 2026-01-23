/**
 * WizardStepSelectItems - Step 3: Item selection
 * Displays checkboxes for selecting specific items to import
 */

import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { GlassCheckbox, GlassButton } from '@bayit/shared/ui'
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme'

// Zod schema for prop validation
const ItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  year: z.string().optional(),
  author: z.string().optional(),
  genre: z.string().optional(),
})

const WizardStepSelectItemsPropsSchema = z.object({
  items: z.array(ItemSchema),
  selectedItems: z.array(z.string()),
  importAll: z.boolean(),
  onSelectItem: z.function().args(z.string(), z.boolean()).returns(z.void()),
  onSelectAll: z.function().args(z.boolean()).returns(z.void()),
  onContinue: z.function().args().returns(z.void()),
  onBack: z.function().args().returns(z.void()),
})

type WizardStepSelectItemsProps = z.infer<typeof WizardStepSelectItemsPropsSchema>

export function WizardStepSelectItems({
  items,
  selectedItems,
  importAll,
  onSelectItem,
  onSelectAll,
  onContinue,
  onBack,
}: WizardStepSelectItemsProps) {
  const selectedCount = importAll ? items.length : selectedItems.length

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={16} color="#9333ea" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {/* Header with select all */}
      <View style={styles.header}>
        <Text style={styles.title}>Select items to import</Text>
        <View style={styles.selectAllContainer}>
          <GlassCheckbox
            checked={importAll}
            onCheckedChange={onSelectAll}
            label={`Select all (${items.length})`}
          />
        </View>
      </View>

      {/* Items list */}
      <ScrollView style={styles.scrollView}>
        {items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <GlassCheckbox
              checked={importAll || selectedItems.includes(item.id)}
              onCheckedChange={(checked) => onSelectItem(item.id, checked)}
              disabled={importAll}
            />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title || item.name}</Text>
              {item.description && (
                <Text style={styles.itemDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              {(item.year || item.author || item.genre) && (
                <Text style={styles.itemMeta}>
                  {[item.year, item.author, item.genre].filter(Boolean).join(' • ')}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Continue button */}
      <GlassButton
        title={`Continue (${selectedCount} selected)`}
        variant="primary"
        onPress={onContinue}
        disabled={!importAll && selectedItems.length === 0}
        style={styles.continueButton}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 250,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  itemDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  continueButton: {
    marginTop: spacing.lg,
  },
})
