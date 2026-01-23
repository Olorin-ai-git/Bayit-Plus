/**
 * CategoryPickerList Component
 *
 * Scrollable dropdown list of categories with search and create option
 * Part of CategoryPicker migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Search input with icon
 * - Scrollable category list (max 240px height)
 * - Category item with primary/secondary names
 * - Selected state indicator (left border + dot)
 * - Create new category button
 * - Loading, error, and empty states
 * - RTL-aware text alignment
 * - Glass morphism styling
 *
 * Props validated with Zod schema
 */

import { View, Text, Pressable, ScrollView } from 'react-native'
import { Search, Plus, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import { platformClass } from '../../../utils/platformClass'
import { CategoryItem } from './CategoryItem'
import type { Category } from '../../../types/content'

const CategoryPickerListPropsSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    name_en: z.string().optional(),
    slug: z.string(),
    order: z.number(),
    is_active: z.boolean(),
    created_at: z.string(),
  })),
  selectedValue: z.string().optional(),
  search: z.string(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  textAlign: z.enum(['left', 'right', 'center']),
  allowCreate: z.boolean(),
  searchPlaceholder: z.string(),
  loadingText: z.string(),
  noResultsText: z.string(),
  noCategoriesText: z.string(),
  createNewText: z.string(),
  onSearchChange: z.function().args(z.string()).returns(z.void()),
  onSelectCategory: z.function().args(z.string()).returns(z.void()),
  onCreateClick: z.function().returns(z.void()),
})

export type CategoryPickerListProps = z.infer<typeof CategoryPickerListPropsSchema>

export function CategoryPickerList({
  categories,
  selectedValue,
  search,
  isLoading,
  error,
  textAlign,
  allowCreate,
  searchPlaceholder,
  loadingText,
  noResultsText,
  noCategoriesText,
  createNewText,
  onSearchChange,
  onSelectCategory,
  onCreateClick,
}: CategoryPickerListProps) {
  const centerClass = 'p-6 items-center'
  const mutedTextClass = 'text-sm text-white/60'

  return (
    <GlassView
      className="mt-2 rounded-lg max-h-[400px] overflow-hidden"
      intensity="high"
    >
      {/* Search Input */}
      <View className="p-2 border-b border-white/10">
        <GlassInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          icon={<Search size={16} color="rgba(255, 255, 255, 0.6)" />}
          autoFocus
        />
      </View>

      {/* Loading State */}
      {isLoading && (
        <View className={centerClass}>
          <Text className={mutedTextClass}>{loadingText}</Text>
        </View>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <View className="flex-row items-center p-4" style={{ gap: 8 }}>
          <AlertCircle size={16} color="#ef4444" />
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}

      {/* Empty State */}
      {!isLoading && !error && categories.length === 0 && (
        <View className={centerClass}>
          <Text className={mutedTextClass}>
            {search ? noResultsText : noCategoriesText}
          </Text>
        </View>
      )}

      {/* Category List */}
      {!isLoading && !error && categories.length > 0 && (
        <ScrollView className="max-h-[240px]">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isSelected={selectedValue === category.id}
              textAlign={textAlign}
              onPress={onSelectCategory}
            />
          ))}
        </ScrollView>
      )}

      {/* Create New Category Button */}
      {allowCreate && (
        <Pressable onPress={onCreateClick}>
          <View className="border-t border-white/10">
            <GlassView className="flex-row items-center px-4 py-3" intensity="medium" style={{ gap: 8 }}>
              <Plus size={16} color="#a855f7" />
              <Text className="text-sm text-purple-500 font-medium">
                {createNewText}
              </Text>
            </GlassView>
          </View>
        </Pressable>
      )}
    </GlassView>
  )
}
