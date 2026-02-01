/**
 * SplitModeConfirmButton Component
 * Confirm button that appears when exactly 2 languages are selected in split mode
 */

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { getLanguageInfo } from '@/types/subtitle'

interface SplitModeConfirmButtonProps {
  selectedLanguages: string[]
  onConfirm: () => void
  disabled?: boolean
}

export default function SplitModeConfirmButton({
  selectedLanguages,
  onConfirm,
  disabled = false,
}: SplitModeConfirmButtonProps) {
  const { t } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)

  // Only show when exactly 2 languages are selected
  if (selectedLanguages.length !== 2) {
    return null
  }

  const [leftLang, rightLang] = selectedLanguages
  const leftInfo = getLanguageInfo(leftLang)
  const rightInfo = getLanguageInfo(rightLang)

  const handleKeyDown = useCallback((event: any) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!disabled) {
        onConfirm()
      }
    }
  }, [disabled, onConfirm])

  return (
    <View style={styles.container}>
      {/* Preview of selected languages */}
      <View
        style={styles.preview}
        accessibilityRole="status"
        accessibilityLive="polite"
      >
        <View style={styles.languagePreview}>
          <Text style={styles.positionLabel}>{t('subtitles.splitScreen.left')}</Text>
          <Text style={styles.languageName}>{leftInfo?.nativeName || leftLang}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.languagePreview}>
          <Text style={styles.positionLabel}>{t('subtitles.splitScreen.right')}</Text>
          <Text style={styles.languageName}>{rightInfo?.nativeName || rightLang}</Text>
        </View>
      </View>

      {/* Confirm button */}
      <Pressable
        onPress={onConfirm}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // @ts-expect-error - onKeyDown is web-specific
        onKeyDown={handleKeyDown}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t('subtitles.splitScreen.confirm')}
        accessibilityState={{ disabled }}
        tabIndex={0}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
          isFocused && styles.buttonFocused,
        ]}
      >
        <Icon name="check" size="md" color={colors.text} />
        <Text style={styles.buttonText}>
          {t('subtitles.splitScreen.confirm')}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassWhiteSubtle,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  languagePreview: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  positionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glassBorderWhite,
    marginHorizontal: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.DEFAULT,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  buttonFocused: {
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px ${colors.primary[400]}40`,
        outline: 'none',
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      },
    }),
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
})
