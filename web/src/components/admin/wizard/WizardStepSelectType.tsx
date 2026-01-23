/**
 * WizardStepSelectType - Step 1: Content type selection
 * Displays grid of importable content types (VOD, Live TV, Radio, Podcasts)
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

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
    <View className={platformClass('flex flex-col gap-4')}>
      <Text
        className={platformClass(
          'text-base font-semibold text-white mb-2'
        )}
      >
        What would you like to import?
      </Text>

      <View className={platformClass('flex flex-col gap-4')}>
        {sourceTypes.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => onSelectType(type.id)}
            className={platformClass(
              'p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/10 cursor-pointer transition-colors'
            )}
          >
            <View className={platformClass('flex flex-row justify-between items-center mb-2')}>
              <Text className={platformClass('text-[28px]')}>{type.icon}</Text>
              <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
            </View>

            <Text className={platformClass('text-[15px] font-semibold text-white')}>
              {type.label}
            </Text>

            <Text className={platformClass('text-xs text-white/60 mt-1')}>
              {type.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
