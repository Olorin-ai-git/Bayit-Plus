/**
 * WizardStepSelectCategory - Step 2.5: Category selection (VOD only)
 * Displays list of categories for imported movies
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { ChevronRight, AlertCircle, ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

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
        Select a category for imported movies
      </Text>

      <Text className={platformClass('text-sm text-white/60 mb-4')}>
        Imported movies will be added to the selected category.
      </Text>

      {/* Loading state */}
      {isLoading ? (
        <View className={platformClass('flex flex-row items-center justify-center gap-4 py-12')}>
          <ActivityIndicator color="#9333ea" />
          <Text className={platformClass('text-sm text-white/60')}>Loading categories...</Text>
        </View>
      ) : error ? (
        /* Error state */
        <View
          className={platformClass(
            'flex flex-row items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20'
          )}
        >
          <AlertCircle size={20} color="#ef4444" />
          <Text className={platformClass('flex-1 text-sm text-red-500')}>{error}</Text>
        </View>
      ) : categories.length === 0 ? (
        /* No categories warning */
        <View
          className={platformClass(
            'flex flex-col items-center gap-4 p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20'
          )}
        >
          <AlertCircle size={24} color="#eab308" />
          <Text className={platformClass('text-sm text-yellow-500 text-center')}>
            No categories found. Please create a category first in the Categories section.
          </Text>
        </View>
      ) : (
        /* Categories list */
        <ScrollView className={platformClass('max-h-[250px]')}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => onSelectCategory(category.id)}
              className={platformClass(
                'flex flex-row items-center p-4 rounded-2xl border border-white/10 bg-white/[0.03] mb-2 hover:bg-white/10 cursor-pointer transition-colors'
              )}
            >
              <View className={platformClass('flex-1')}>
                <Text className={platformClass('text-[15px] font-semibold text-white')}>
                  {category.name}
                </Text>
                {category.description && (
                  <Text className={platformClass('text-xs text-white/60 mt-1')}>
                    {category.description}
                  </Text>
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
