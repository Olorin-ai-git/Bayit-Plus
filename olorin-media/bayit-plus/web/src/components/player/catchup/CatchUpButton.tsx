/**
 * CatchUpButton Component
 * Glass floating action button for triggering the Catch-Up summary feature.
 * Displays credit cost, handles disabled/loading states.
 */

import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'
import { Clock } from 'lucide-react'

interface CatchUpButtonProps {
  creditCost: number
  disabled?: boolean
  isLoading?: boolean
  onPress: () => void
}

export default function CatchUpButton({
  creditCost,
  disabled = false,
  isLoading = false,
  onPress,
}: CatchUpButtonProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const isInteractive = !disabled && !isLoading

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        isHovered && isInteractive && styles.buttonHovered,
        disabled && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('catchup.button.label', { cost: creditCost })}
      accessibilityState={{ disabled }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Clock size={18} color={disabled ? colors.textDisabled : colors.text} />
      )}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {t('catchup.button.credits', { cost: creditCost })}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: glass.bgMedium, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: glass.borderLight,
    // @ts-expect-error backdropFilter is web-only
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  },
  buttonHovered: { backgroundColor: glass.bgStrong, borderColor: glass.border },
  buttonDisabled: { opacity: 0.5 },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  labelDisabled: { color: colors.textDisabled },
})
