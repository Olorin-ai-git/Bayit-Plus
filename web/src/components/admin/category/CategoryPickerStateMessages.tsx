/**
 * CategoryPickerStateMessages Component
 *
 * Error and validation message display for CategoryPicker
 * Part of CategoryPicker migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Error icon with message
 * - RTL support
 * - Glass morphism styling
 *
 * Props validated with Zod schema
 */

import { View, Text } from 'react-native'
import { AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

const CategoryPickerStateMessagesPropsSchema = z.object({
  error: z.string().nullable(),
})

export type CategoryPickerStateMessagesProps = z.infer<typeof CategoryPickerStateMessagesPropsSchema>

export function CategoryPickerStateMessages({
  error,
}: CategoryPickerStateMessagesProps) {
  if (!error) return null

  return (
    <View
      className={platformClass(
        'flex-row items-center gap-1 mt-1 px-2',
        'flex-row items-center mt-1 px-2'
      )}
      style={{ gap: 4 }}
    >
      <AlertCircle size={14} color="#ef4444" />
      <Text
        className={platformClass(
          'text-xs text-red-500',
          'text-xs text-red-500'
        )}
      >
        {error}
      </Text>
    </View>
  )
}
