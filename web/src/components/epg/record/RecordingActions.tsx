/**
 * Recording action buttons for EPG recording modal
 * Cancel and Confirm buttons with loading state
 * @module epg/record/RecordingActions
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import { useDirection } from '@/hooks/useDirection'

/**
 * Props schema
 */
const RecordingActionsPropsSchema = z.object({
  onCancel: z.function().args().returns(z.void()),
  onConfirm: z.function().args().returns(z.void()),
  loading: z.boolean(),
})

type RecordingActionsProps = z.infer<typeof RecordingActionsPropsSchema>

/**
 * Recording action buttons component
 */
const RecordingActions: React.FC<RecordingActionsProps> = ({
  onCancel,
  onConfirm,
  loading,
}) => {
  const { t } = useTranslation()
  const { flexDirection } = useDirection()

  return (
    <View
      className={platformClass('flex gap-4')}
      style={{ flexDirection }}
    >
      {/* Cancel Button */}
      <Pressable
        className={platformClass(
          'flex-1 py-4 rounded-2xl items-center justify-center bg-white/10 border border-white/10 active:opacity-80'
        )}
        onPress={onCancel}
      >
        <Text className={platformClass('text-sm font-semibold text-white')}>
          {t('common.cancel')}
        </Text>
      </Pressable>

      {/* Confirm Button */}
      <Pressable
        className={platformClass(
          `flex-1 py-4 rounded-2xl items-center justify-center bg-purple-500 active:opacity-80 ${
            loading ? 'opacity-50' : ''
          }`
        )}
        onPress={onConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text className={platformClass('text-sm font-semibold text-white')}>
            {t('epg.scheduleRecording')}
          </Text>
        )}
      </Pressable>
    </View>
  )
}

export default RecordingActions
