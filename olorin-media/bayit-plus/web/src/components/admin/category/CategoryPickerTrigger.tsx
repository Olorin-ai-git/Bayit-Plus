/**
 * CategoryPickerTrigger Component
 *
 * Displays selected category with dropdown trigger button
 * Part of CategoryPicker migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Selected category display with primary/secondary names
 * - Placeholder state for no selection
 * - Chevron icon with rotation animation
 * - Error state styling
 * - RTL-aware text alignment
 * - Loading/disabled state support
 * - Glass morphism styling
 *
 * Props validated with Zod schema
 */

import { View, Text, Pressable } from 'react-native'
import { ChevronDown } from 'lucide-react'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { platformClass } from '../../../utils/platformClass'
import type { Category } from '../../../types/content'

const CategoryPickerTriggerPropsSchema = z.object({
  selectedCategory: z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  }).nullable(),
  placeholder: z.string(),
  isOpen: z.boolean(),
  isLoading: z.boolean(),
  hasError: z.boolean(),
  textAlign: z.enum(['left', 'right', 'center']),
  onPress: z.function().returns(z.void()),
})

export type CategoryPickerTriggerProps = z.infer<typeof CategoryPickerTriggerPropsSchema>

export function CategoryPickerTrigger({
  selectedCategory,
  placeholder,
  isOpen,
  isLoading,
  hasError,
  textAlign,
  onPress,
}: CategoryPickerTriggerProps) {
  return (
    <Pressable onPress={onPress} disabled={isLoading}>
      <GlassView
        className={platformClass(
          `flex-row items-center justify-between px-4 py-3 rounded-lg min-h-[48px] ${
            hasError ? 'border border-red-500' : ''
          }`,
          `flex-row items-center justify-between px-4 py-3 rounded-lg min-h-[48px] ${
            hasError ? 'border border-red-500' : ''
          }`
        )}
        intensity="medium"
      >
        <Text
          className={platformClass(
            `flex-1 text-sm ${
              selectedCategory ? 'text-white' : 'text-white/60'
            }`,
            `flex-1 text-sm ${
              selectedCategory ? 'text-white' : 'text-white/60'
            }`
          )}
          style={{ textAlign }}
        >
          {selectedCategory ? selectedCategory.name : placeholder}
        </Text>
        <View
          className={platformClass(
            'transition-transform duration-200',
            ''
          )}
          style={{
            transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
          }}
        >
          <ChevronDown
            size={16}
            color="rgba(255, 255, 255, 0.6)"
          />
        </View>
      </GlassView>
    </Pressable>
  )
}
