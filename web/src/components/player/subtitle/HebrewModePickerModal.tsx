/**
 * HebrewModePickerModal Component
 * Modal for selecting Hebrew subtitle display mode (regular, nikud, shoresh)
 */

import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { HebrewMode } from '@/types/subtitle'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface HebrewModePickerModalProps {
  visible: boolean
  currentMode: HebrewMode
  hasNikud: boolean
  hasShoresh: boolean
  onClose: () => void
  onModeSelect: (mode: HebrewMode) => void
}

interface ModeOption {
  mode: HebrewMode
  icon: string
  titleKey: string
  descriptionKey: string
  example: string
}

const HEBREW_MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'regular',
    icon: '🔤',
    titleKey: 'subtitles.hebrewMode.regular.title',
    descriptionKey: 'subtitles.hebrewMode.regular.description',
    example: 'הילדים הולכים לבית הספר',
  },
  {
    mode: 'nikud',
    icon: 'א׳',
    titleKey: 'subtitles.hebrewMode.nikud.title',
    descriptionKey: 'subtitles.hebrewMode.nikud.description',
    example: 'הַיְלָדִים הוֹלְכִים לְבֵית הַסֵּפֶר',
  },
  {
    mode: 'shoresh',
    icon: '📖',
    titleKey: 'subtitles.hebrewMode.shoresh.title',
    descriptionKey: 'subtitles.hebrewMode.shoresh.description',
    example: 'הילדים [ילד] הולכים [הלך] לבית [בית] הספר [ספר]',
  },
]

export default function HebrewModePickerModal({
  visible,
  currentMode,
  hasNikud,
  hasShoresh,
  onClose,
  onModeSelect,
}: HebrewModePickerModalProps) {
  const { t } = useTranslation()

  const handleModePress = (mode: HebrewMode) => {
    onModeSelect(mode)
    onClose()
  }

  const isModeAvailable = (mode: HebrewMode): boolean => {
    if (mode === 'regular') return true
    if (mode === 'nikud') return hasNikud
    if (mode === 'shoresh') return hasShoresh
    return false
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('subtitles.hebrewMode.title', 'Hebrew Display Mode')}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.optionsContainer}>
            {HEBREW_MODE_OPTIONS.map((option) => {
              const isAvailable = isModeAvailable(option.mode)
              const isSelected = option.mode === currentMode

              return (
                <Pressable
                  key={option.mode}
                  onPress={() => isAvailable && handleModePress(option.mode)}
                  disabled={!isAvailable}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    !isAvailable && styles.optionDisabled,
                    { opacity: pressed && isAvailable ? 0.7 : 1 },
                  ]}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <View style={styles.optionTexts}>
                      <Text style={[
                        styles.optionTitle,
                        !isAvailable && styles.optionTitleDisabled
                      ]}>
                        {t(option.titleKey, option.mode)}
                      </Text>
                      <Text style={[
                        styles.optionDescription,
                        !isAvailable && styles.optionDescriptionDisabled
                      ]}>
                        {t(option.descriptionKey, 'Description')}
                      </Text>
                      <Text style={styles.optionExample}>{option.example}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                    {!isAvailable && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>
                          {t('subtitles.hebrewMode.unavailable', 'Unavailable')}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
    backdropFilter: 'blur(20px)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.md,  // Increased from spacing.sm for 44×44pt touch target
    minHeight: 44,  // iOS HIG minimum
    minWidth: 44,  // iOS HIG minimum
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: colors.primary,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionTitleDisabled: {
    color: colors.textSecondary,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  optionDescriptionDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  optionExample: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
    direction: 'rtl',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unavailableText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
})
