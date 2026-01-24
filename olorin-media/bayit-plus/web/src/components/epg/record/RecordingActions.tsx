/**
 * Recording action buttons for EPG recording modal
 * Cancel and Confirm buttons with loading state
 * @module epg/record/RecordingActions
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
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
    <View style={[styles.container, { flexDirection }]}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.cancelButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.confirmButton,
          pressed && styles.buttonPressed,
          loading && styles.buttonDisabled,
        ]}
        onPress={onConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.confirmButtonText}>{t('epg.scheduleRecording')}</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmButton: {
    backgroundColor: '#a855f7',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})

export default RecordingActions
