/**
 * SplitModeToggle Component
 * Toggle switch for enabling/disabling split screen subtitle mode
 */

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

interface SplitModeToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export default function SplitModeToggle({
  enabled,
  onToggle,
  disabled = false,
}: SplitModeToggleProps) {
  const { t } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)

  const handlePress = useCallback(() => {
    if (!disabled) {
      onToggle(!enabled)
    }
  }, [disabled, enabled, onToggle])

  const handleKeyDown = useCallback((event: any) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePress()
    }
  }, [handlePress])

  return (
    <Pressable
      onPress={handlePress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      // @ts-expect-error - onKeyDown is web-specific
      onKeyDown={handleKeyDown}
      disabled={disabled}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled }}
      accessibilityLabel={`${t('subtitles.splitScreen.toggle')}. ${t('subtitles.splitScreen.description')}`}
      tabIndex={0}
      style={({ pressed }) => [
        styles.container,
        enabled && styles.containerEnabled,
        disabled && styles.containerDisabled,
        pressed && !disabled && styles.containerPressed,
        isFocused && styles.containerFocused,
      ]}
    >
      <View style={styles.iconContainer}>
        <Icon
          name="splitScreen"
          size="md"
          color={enabled ? colors.primary.DEFAULT : colors.textSecondary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, enabled && styles.titleEnabled]}>
          {t('subtitles.splitScreen.toggle')}
        </Text>
        <Text style={styles.description}>
          {t('subtitles.splitScreen.description')}
        </Text>
      </View>
      <View style={[styles.toggle, enabled && styles.toggleEnabled]}>
        <View style={[styles.toggleKnob, enabled && styles.toggleKnobEnabled]} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderWhite,
    backgroundColor: colors.glass,
    gap: spacing.sm,
  },
  containerEnabled: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.glassPurpleLight,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  containerPressed: {
    opacity: 0.8,
  },
  containerFocused: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px ${colors.primary[400]}80`,
        outline: 'none',
      },
    }),
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassWhiteSubtle,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleEnabled: {
    color: colors.primary.DEFAULT,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.glassBorderWhite,
    padding: 2,
    justifyContent: 'center',
  },
  toggleEnabled: {
    backgroundColor: colors.primary.DEFAULT,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease',
      },
    }),
  },
  toggleKnobEnabled: {
    backgroundColor: colors.text,
    transform: [{ translateX: 20 }],
  },
})
