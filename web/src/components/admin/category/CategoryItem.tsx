/**
 * CategoryItem Component
 *
 * Individual category item for dropdown list
 * Part of CategoryPicker migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Primary and secondary category names
 * - Selected state indicator (left border + dot)
 * - Glass morphism styling
 * - RTL-aware text alignment
 *
 * Props validated with Zod schema
 */

import { View, Text, Pressable } from 'react-native'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { platformClass } from '../../../utils/platformClass'

const CategoryItemPropsSchema = z.object({
  category: z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  }),
  isSelected: z.boolean(),
  textAlign: z.enum(['left', 'right', 'center']),
  onPress: z.function().args(z.string()).returns(z.void()),
})

export type CategoryItemProps = z.infer<typeof CategoryItemPropsSchema>

export function CategoryItem({
  category,
  isSelected,
  textAlign,
  onPress,
}: CategoryItemProps) {
  return (
    <Pressable
      key={category.id}
      onPress={() => onPress(category.id)}
    >
      <View
        className={platformClass(
          'border-b border-white/10',
          'border-b border-white/10'
        )}
      >
        <GlassView
          className={platformClass(
            `flex-row items-center justify-between px-4 py-3 ${
              isSelected ? 'border-l-[3px] border-l-purple-500' : ''
            }`,
            `flex-row items-center justify-between px-4 py-3 ${
              isSelected ? 'border-l-[3px] border-l-purple-500' : ''
            }`
          )}
          intensity={isSelected ? 'high' : 'low'}
        >
          <View className={platformClass('flex-1', 'flex-1')}>
            <Text
              className={platformClass(
                'text-sm font-medium text-white',
                'text-sm font-medium text-white'
              )}
              style={{ textAlign }}
            >
              {category.name}
            </Text>
            {category.name_en && (
              <Text
                className={platformClass(
                  'text-xs text-white/60 mt-1',
                  'text-xs text-white/60 mt-1'
                )}
                style={{ textAlign }}
              >
                {category.name_en}
              </Text>
            )}
          </View>
          {isSelected && (
            <View
              className={platformClass(
                'w-2 h-2 rounded-full bg-purple-500',
                'w-2 h-2 rounded-full bg-purple-500'
              )}
            />
          )}
        </GlassView>
      </View>
    </Pressable>
  )
}
