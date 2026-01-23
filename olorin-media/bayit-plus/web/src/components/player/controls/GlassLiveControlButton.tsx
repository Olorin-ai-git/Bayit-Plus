/**
 * GlassLiveControlButton Component
 * Consistent glassmorphic button for live player controls (Live Translate, Live Dubbing)
 */

import { useState, ReactNode } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

interface GlassLiveControlButtonProps {
  icon: ReactNode
  label: string
  isEnabled: boolean
  isConnecting?: boolean
  isPremium: boolean
  onPress: () => void
  premiumLabel?: string
}

export function GlassLiveControlButton({
  icon,
  label,
  isEnabled,
  isConnecting = false,
  isPremium,
  onPress,
  premiumLabel = '⭐ Premium',
}: GlassLiveControlButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const displayLabel = isPremium ? label : premiumLabel

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        isEnabled && styles.buttonEnabled,
        !isPremium && styles.buttonPremium,
        isHovered && styles.buttonHovered,
      ]}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{ pressed: isEnabled }}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>{icon}</View>

      {/* Label */}
      <Text
        style={[
          styles.buttonText,
          isEnabled && styles.textEnabled,
          !isPremium && styles.textPremium,
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>

      {/* Loading indicator */}
      {isConnecting && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
      )}

      {/* Connected indicator */}
      {isEnabled && !isConnecting && <View style={styles.connectedDot} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: isTV ? spacing.md : spacing.sm + 4,
    paddingVertical: isTV ? spacing.sm + 2 : spacing.xs + 4,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: isTV ? 44 : 36,
  },
  buttonEnabled: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPremium: {
    borderColor: '#fbbf24', // Gold color for premium
    borderStyle: 'dashed',
  },
  buttonHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: isTV ? 15 : 13,
    fontWeight: '600',
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
  },
  textEnabled: {
    color: colors.text,
  },
  textPremium: {
    color: '#fbbf24', // Gold color for premium
  },
  loader: {
    marginLeft: spacing.xs,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: spacing.xs,
  },
})

export default GlassLiveControlButton
