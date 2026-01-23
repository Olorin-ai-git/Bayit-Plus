/**
 * WizardStepSelectType - Step 1: Content type selection
 * Displays grid of importable content types (VOD, Live TV, Radio, Podcasts)
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme'

// Zod schema for prop validation
const SourceTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  icon: z.string(),
})

const WizardStepSelectTypePropsSchema = z.object({
  sourceTypes: z.array(SourceTypeSchema),
  onSelectType: z.function().args(z.string()).returns(z.void()),
})

type WizardStepSelectTypeProps = z.infer<typeof WizardStepSelectTypePropsSchema>

export function WizardStepSelectType({ sourceTypes, onSelectType }: WizardStepSelectTypeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What would you like to import?</Text>

      <View style={styles.typesList}>
        {sourceTypes.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => onSelectType(type.id)}
            style={styles.typeItem}
          >
            <View style={styles.typeHeader}>
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
            </View>

            <Text style={styles.typeLabel}>{type.label}</Text>

            <Text style={styles.typeDescription}>{type.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  typesList: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  typeItem: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeIcon: {
    fontSize: 28,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeDescription: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.xs,
  },
})
