/**
 * WizardStepConfirm - Step 4: Confirmation screen
 * Displays import summary and confirmation before executing
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { GlassButton } from '@bayit/shared/ui'
import { platformClass } from '../../../utils/platformClass'

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
    <View className={platformClass('flex flex-col gap-4')}>
      {/* Back button */}
      <Pressable
        onPress={onBack}
        className={platformClass('flex flex-row items-center gap-1 mb-4 hover:opacity-70 cursor-pointer')}
      >
        <ChevronLeft size={16} color="#9333ea" />
        <Text className={platformClass('text-sm text-purple-600')}>Back</Text>
      </Pressable>

      <Text className={platformClass('text-base font-semibold text-white mb-2')}>
        Ready to import?
      </Text>

      {/* Confirmation box */}
      <View
        className={platformClass(
          'p-6 rounded-2xl bg-purple-900/20 border border-purple-900/30'
        )}
      >
        <Text className={platformClass('text-sm text-white mb-2')}>
          You are about to import {importAll ? 'all' : selectedItemsCount} item(s) from{' '}
          <Text className={platformClass('font-semibold text-purple-600')}>
            {currentSource.name}
          </Text>
          .
        </Text>

        {sourceType === 'vod' && selectedCategory && (
          <Text className={platformClass('text-sm text-white mb-2')}>
            Category:{' '}
            <Text className={platformClass('font-semibold text-purple-600')}>
              {selectedCategory.name}
            </Text>
          </Text>
        )}

        {/* Notes */}
        <View className={platformClass('mt-4 flex flex-col gap-1')}>
          <Text className={platformClass('text-[13px] text-white/60')}>
            • Items will be added to your content library
          </Text>
          <Text className={platformClass('text-[13px] text-white/60')}>
            • You can edit them after import
          </Text>
          <Text className={platformClass('text-[13px] text-white/60')}>
            • This action cannot be undone
          </Text>
        </View>
      </View>

      {/* Error display */}
      {error && (
        <View
          className={platformClass(
            'flex flex-row items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20'
          )}
        >
          <AlertCircle size={20} color="#ef4444" />
          <Text className={platformClass('flex-1 text-sm text-red-500')}>{error}</Text>
        </View>
      )}

      {/* Actions */}
      <View className={platformClass('flex flex-row gap-4 mt-6')}>
        <GlassButton
          title="Cancel"
          variant="secondary"
          onPress={onBack}
          disabled={isLoading}
          className={platformClass('flex-1')}
        />
        <GlassButton
          title={isLoading ? 'Importing...' : 'Import Now'}
          variant="primary"
          onPress={onImport}
          disabled={isLoading}
          className={platformClass('flex-1')}
        />
      </View>
    </View>
  )
}
