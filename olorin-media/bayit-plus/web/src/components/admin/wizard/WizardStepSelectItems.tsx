/**
 * WizardStepSelectItems - Step 3: Item selection
 * Displays checkboxes for selecting specific items to import
 */

import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { GlassCheckbox, GlassButton } from '@bayit/shared/ui'
import { platformClass } from '../../../utils/platformClass'

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
    <View className={platformClass('flex flex-col gap-4')}>
      {/* Back button */}
      <Pressable
        onPress={onBack}
        className={platformClass('flex flex-row items-center gap-1 mb-4 hover:opacity-70 cursor-pointer')}
      >
        <ChevronLeft size={16} color="#9333ea" />
        <Text className={platformClass('text-sm text-purple-600')}>Back</Text>
      </Pressable>

      {/* Header with select all */}
      <View className={platformClass('flex flex-row justify-between items-center mb-4')}>
        <Text className={platformClass('text-base font-semibold text-white')}>
          Select items to import
        </Text>
        <View className={platformClass('flex flex-row items-center')}>
          <GlassCheckbox
            checked={importAll}
            onCheckedChange={onSelectAll}
            label={`Select all (${items.length})`}
          />
        </View>
      </View>

      {/* Items list */}
      <ScrollView className={platformClass('max-h-[250px]')}>
        {items.map((item) => (
          <View
            key={item.id}
            className={platformClass(
              'flex flex-row items-start gap-4 py-2 px-2 rounded-xl mb-1'
            )}
          >
            <GlassCheckbox
              checked={importAll || selectedItems.includes(item.id)}
              onCheckedChange={(checked) => onSelectItem(item.id, checked)}
              disabled={importAll}
            />
            <View className={platformClass('flex-1')}>
              <Text className={platformClass('text-sm font-medium text-white')}>
                {item.title || item.name}
              </Text>
              {item.description && (
                <Text
                  className={platformClass('text-xs text-white/60 mt-0.5')}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              )}
              {(item.year || item.author || item.genre) && (
                <Text className={platformClass('text-[11px] text-white/60 mt-0.5')}>
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
        className={platformClass('mt-6')}
      />
    </View>
  )
}
