/**
 * GlassLiveControlButton Component
 * Consistent glassmorphic button for live player controls (Live Translate, Live Dubbing)
 */

import { useState, useEffect, useRef, ReactNode } from 'react'
import { View, Text, Pressable, ActivityIndicator, Animated, StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulsing animation for the connected indicator
  useEffect(() => {
    if (isEnabled && !isConnecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isEnabled, isConnecting, pulseAnim])

  const displayLabel = isPremium ? label : premiumLabel

  return (
    <Pressable
      onPress={isConnecting ? undefined : onPress}
      disabled={isConnecting}
      onHoverIn={() => !isConnecting && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        isEnabled && styles.buttonEnabled,
        !isPremium && styles.buttonPremium,
        isHovered && !isConnecting && styles.buttonHovered,
        isConnecting && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{ pressed: isEnabled, disabled: isConnecting }}
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

      {/* Connected indicator - Blinking green dot */}
      {isEnabled && !isConnecting && (
        <Animated.View
          style={[
            styles.connectedDot,
            { opacity: pulseAnim }
          ]}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: isTV ? spacing.lg : spacing.md,
    paddingVertical: isTV ? spacing.sm + 2 : spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: isTV ? 44 : 40,
    minWidth: isTV ? 180 : 150,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonEnabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonPremium: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    borderStyle: 'dashed',
  },
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    borderColor: 'rgba(139, 92, 246, 0.7)',
    transform: [{ scale: 1.03 }],
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
    backgroundColor: colors.success.DEFAULT,
    marginLeft: spacing.xs,
  },
})

export default GlassLiveControlButton
