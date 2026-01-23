/**
 * WizardStepSelectSource - Step 2: Source selection
 * Displays list of available sources for the selected content type
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { ChevronRight, AlertCircle, ChevronLeft } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

// Zod schema for prop validation
const SourceSchema = z.object({
  name: z.string(),
  description: z.string(),
  items: z.array(z.any()),
})

const WizardStepSelectSourcePropsSchema = z.object({
  sources: z.record(z.string(), SourceSchema),
  currentSourceType: z.object({
    id: z.string(),
    label: z.string(),
  }).nullable(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onSelectSource: z.function().args(z.string()).returns(z.void()),
  onBack: z.function().args().returns(z.void()),
})

type WizardStepSelectSourceProps = z.infer<typeof WizardStepSelectSourcePropsSchema>

export function WizardStepSelectSource({
  sources,
  currentSourceType,
  isLoading,
  error,
  onSelectSource,
  onBack,
}: WizardStepSelectSourceProps) {
  if (!currentSourceType) {
    return null
  }

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
        Select a source for {currentSourceType.label.toLowerCase()}
      </Text>

      {/* Loading state */}
      {isLoading ? (
        <View className={platformClass('flex flex-row items-center justify-center gap-4 py-12')}>
          <ActivityIndicator color="#9333ea" />
          <Text className={platformClass('text-sm text-white/60')}>Loading sources...</Text>
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
      ) : (
        /* Sources list */
        <View className={platformClass('flex flex-col gap-2')}>
          {Object.entries(sources).map(([key, source]) => (
            <Pressable
              key={key}
              onPress={() => onSelectSource(key)}
              className={platformClass(
                'flex flex-row items-center p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/10 cursor-pointer transition-colors'
              )}
            >
              <View className={platformClass('flex-1')}>
                <Text className={platformClass('text-[15px] font-semibold text-white')}>
                  {source.name}
                </Text>
                <Text className={platformClass('text-xs text-white/60 mt-1')}>
                  {source.description}
                </Text>
                <Text className={platformClass('text-[11px] text-white/60 mt-1')}>
                  {source.items.length} items available
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
