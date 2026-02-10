/**
 * TranscriptTimelineButton Component
 * Floating button to toggle the transcript timeline panel
 */

import React, { useState } from 'react'
import { Text, Pressable, StyleSheet, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react-native'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'

interface TranscriptTimelineButtonProps {
  onPress: () => void
  disabled?: boolean
  transcriptCount?: number
}

export function TranscriptTimelineButton({
  onPress,
  disabled = false,
  transcriptCount,
}: TranscriptTimelineButtonProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const isTV = Platform.isTV || Platform.OS === 'tvos'

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        isHovered && !disabled && styles.buttonHovered,
        disabled && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('catchup.timeline.buttonLabel')}
      accessibilityState={{ disabled }}
    >
      <FileText size={isTV ? 22 : 18} color={disabled ? colors.textDisabled : colors.text} />
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {t('catchup.timeline.buttonTitle')}
      </Text>
      {transcriptCount !== undefined && transcriptCount > 0 && (
        <Text style={styles.badge}>{transcriptCount}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: glass.bgMedium,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: glass.borderLight,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  buttonHovered: {
    backgroundColor: glass.bgStrong,
    borderColor: glass.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
  badge: {
    backgroundColor: colors.primary[500],
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    minWidth: 20,
    textAlign: 'center',
  },
})

export default TranscriptTimelineButton
