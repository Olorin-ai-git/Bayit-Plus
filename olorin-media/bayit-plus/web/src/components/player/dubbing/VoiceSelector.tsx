/**
 * Voice Selection Modal for Live Dubbing
 *
 * Allows users to select from available ElevenLabs voices.
 */

import { useState } from 'react'
import { View, Text, ScrollView, Modal, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Check } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import { isTV } from '@bayit/shared/utils/platform'

export interface Voice {
  id: string
  name: string
  description?: string
  language?: string
}

interface VoiceSelectorProps {
  visible: boolean
  voices: Voice[]
  selectedVoiceId?: string
  onSelect: (voiceId: string) => void
  onClose: () => void
}

export function VoiceSelector({
  visible,
  voices,
  selectedVoiceId,
  onSelect,
  onClose,
}: VoiceSelectorProps) {
  const { t } = useTranslation()

  function handleVoiceSelect(voiceId: string) {
    onSelect(voiceId)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <GlassView style={styles.voicePickerContainer} intensity="high">
            {/* Header */}
            <View style={styles.voicePickerHeader}>
              <Text style={styles.voicePickerTitle}>
                {t('dubbing.selectVoice', 'Select Voice')}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close', 'Close')}
              >
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Voice List */}
            <ScrollView style={styles.voiceList} showsVerticalScrollIndicator={false}>
              {voices.length > 0 ? (
                voices.map((voice) => {
                  const isSelected = voice.id === selectedVoiceId
                  return (
                    <Pressable
                      key={voice.id}
                      onPress={() => handleVoiceSelect(voice.id)}
                      style={({ pressed }) => [
                        styles.voiceItem,
                        isSelected && styles.voiceItemSelected,
                        pressed && styles.voiceItemPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${voice.name}${voice.description ? ` - ${voice.description}` : ''}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.voiceInfo}>
                        <Text style={styles.voiceName}>{voice.name}</Text>
                        {voice.description && (
                          <Text style={styles.voiceDescription}>{voice.description}</Text>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Check size={16} color={colors.text} />
                        </View>
                      )}
                    </Pressable>
                  )
                })
              ) : (
                <Text style={styles.emptyText}>
                  {t('dubbing.noVoicesAvailable', 'No voices available')}
                </Text>
              )}
            </ScrollView>
          </GlassView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  voicePickerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 600,
  },
  voicePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  voicePickerTitle: {
    fontSize: isTV ? 22 : 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  voiceList: {
    maxHeight: 450,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  voiceItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceItemPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.4)',
    transform: [{ scale: 0.98 }],
  },
  voiceInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  voiceName: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  voiceDescription: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: isTV ? 16 : 14,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
})
