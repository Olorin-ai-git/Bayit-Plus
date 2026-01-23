/**
 * WizardStepImporting - Step 5: Progress indicator
 * Displays import progress and completion status
 */

import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { CheckCircle } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

// Zod schema for prop validation
const WizardStepImportingPropsSchema = z.object({
  progress: z.number(),
})

type WizardStepImportingProps = z.infer<typeof WizardStepImportingPropsSchema>

export function WizardStepImporting({ progress }: WizardStepImportingProps) {
  const isComplete = progress === 100

  return (
    <View
      className={platformClass(
        'flex flex-col items-center justify-center py-24 gap-6'
      )}
    >
      {isComplete ? (
        <>
          <CheckCircle size={64} color="#22c55e" />
          <Text className={platformClass('text-lg font-semibold text-white')}>
            Import Complete!
          </Text>
          <Text className={platformClass('text-sm text-white/60 text-center')}>
            Your content has been successfully imported to the library.
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className={platformClass('text-lg font-semibold text-white')}>
            Importing Content...
          </Text>

          {/* Progress bar */}
          <View
            className={platformClass(
              'w-[200px] h-2 rounded bg-white/10 overflow-hidden'
            )}
          >
            <View
              className={platformClass('h-full bg-purple-600')}
              style={{ width: `${progress}%` }}
            />
          </View>

          <Text className={platformClass('text-sm text-white/60')}>
            {progress}% complete
          </Text>
        </>
      )}
    </View>
  )
}
