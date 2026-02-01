/**
 * GlassLiveControlButton Component
 * Consistent glassmorphic button for live player controls (Live Translate, Live Dubbing)
 */

import { useState, useEffect, useRef, ReactNode } from 'react'
import { View, Text, Pressable, ActivityIndicator, Animated, StyleSheet } from 'react-native'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassTooltip } from '@bayit/shared/components/ui/GlassTooltip'

interface GlassLiveControlButtonProps {
  icon: ReactNode
  label: string
  isEnabled: boolean
  isConnecting?: boolean
  isPremium: boolean
  onPress: () => void
  premiumLabel?: string
  premiumIcon?: ReactNode
  quotaExceeded?: boolean
  tooltip?: string
  /** Optional split button: shows a secondary action section (like Record's chevron) */
  splitIcon?: ReactNode
  onSplitPress?: () => void
  splitAccessibilityLabel?: string
  splitTooltip?: string
}

export function GlassLiveControlButton({
  icon,
  label,
  isEnabled,
  isConnecting = false,
  isPremium,
  onPress,
  premiumLabel = 'Premium',
  premiumIcon = <Icon name="star" size="sm" color="#fbbf24" />,
  quotaExceeded = false,
  tooltip,
  splitIcon,
  onSplitPress,
  splitAccessibilityLabel,
  splitTooltip,
}: GlassLiveControlButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isSplitHovered, setIsSplitHovered] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const hasSplit = !!(splitIcon && onSplitPress && isEnabled && !isConnecting)

  // Pulsing animation for connecting/connected indicator
  // Shows immediately when connecting AND continues while connected
  useEffect(() => {
    if (isEnabled || isConnecting) {
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
  const isDisabled = isConnecting || quotaExceeded
  // Show pressed/enabled style immediately when connecting (optimistic UI)
  const showActiveStyle = isEnabled || isConnecting

  const mainButton = (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      onHoverIn={() => !isDisabled && setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.button,
        showActiveStyle && styles.buttonEnabled,
        !isPremium && styles.buttonPremium,
        isHovered && !isDisabled && styles.buttonHovered,
        isDisabled && styles.buttonDisabled,
        hasSplit && styles.buttonSplitLeft,
      ]}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{ pressed: isEnabled, disabled: isDisabled }}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>{icon}</View>

      {/* Label with optional premium icon */}
      <View style={styles.labelContainer}>
        {!isPremium && premiumIcon}
        <Text
          style={[
            styles.buttonText,
            showActiveStyle && styles.textEnabled,
            !isPremium && styles.textPremium,
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </View>

      {/* Loading indicator */}
      {isConnecting && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
      )}

      {/* Active indicator - Pulsing green dot (shows during connecting AND connected) */}
      {(isEnabled || isConnecting) && (
        <Animated.View
          style={[
            styles.connectedDot,
            { opacity: pulseAnim }
          ]}
        />
      )}
    </Pressable>
  )

  return (
    <View style={[styles.splitGroup, hasSplit && styles.splitGroupActive]}>
      {tooltip ? (
        <GlassTooltip content={tooltip} position="top">
          {mainButton}
        </GlassTooltip>
      ) : mainButton}

      {/* Split section - secondary action button */}
      {hasSplit && (
        <GlassTooltip content={splitTooltip || ''} position="top" disabled={!splitTooltip}>
          <Pressable
            onPress={onSplitPress}
            onHoverIn={() => setIsSplitHovered(true)}
            onHoverOut={() => setIsSplitHovered(false)}
            style={[
              styles.splitButton,
              isEnabled && styles.splitButtonEnabled,
              isSplitHovered && styles.splitButtonHovered,
            ]}
            accessibilityRole="button"
            accessibilityLabel={splitAccessibilityLabel}
          >
            {splitIcon}
          </Pressable>
        </GlassTooltip>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  splitGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitGroupActive: {
    gap: 1,
  },
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
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  buttonSplitLeft: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  splitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTV ? spacing.md : spacing.sm,
    paddingVertical: isTV ? spacing.sm + 2 : spacing.sm,
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: isTV ? 44 : 40,
  },
  splitButtonEnabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    borderLeftColor: 'rgba(139, 92, 246, 0.4)',
  },
  splitButtonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
  },
})

export default GlassLiveControlButton
