/**
 * WatchPartyButton Component
 * Entry point for Watch Party feature with 3 states: Idle, Active, Host
 */

import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, Plus, UserPlus, ChevronDown, Crown } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'

interface WatchPartyButtonProps {
  hasActiveParty: boolean
  isHost?: boolean
  onCreateClick: () => void
  onJoinClick: () => void
  onPanelToggle: () => void
}

export default function WatchPartyButton({
  hasActiveParty,
  isHost = false,
  onCreateClick,
  onJoinClick,
  onPanelToggle,
}: WatchPartyButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const rotateAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0)).current
  const tvFocus = useTVFocus({ styleType: 'button' })

  // Chevron rotation animation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  // Pulse animation for active state
  useEffect(() => {
    if (hasActiveParty) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [hasActiveParty])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: I18nManager.isRTL ? ['180deg', '0deg'] : ['0deg', '180deg'],
  })

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  })

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  })

  // Active Party State (Host or Participant)
  if (hasActiveParty) {
    return (
      <Pressable
        onPress={onPanelToggle}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        onFocus={tvFocus.handleFocus}
        onBlur={tvFocus.handleBlur}
        focusable={true}
        style={({ pressed }) => [
          styles.activeButton,
          isHost && styles.hostButton,
          (isHovered || pressed) && styles.activeButtonHovered,
          tvFocus.isFocused && tvFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isHost
            ? t('watchParty.hostActiveLabel', 'Watch Party - You are hosting')
            : t('watchParty.activeLabel', 'Watch Party - Active')
        }
        accessibilityState={{ expanded: false }}
      >
        {isHost ? (
          <Crown size={isTV ? 22 : 18} color="#F59E0B" />
        ) : (
          <Users size={isTV ? 22 : 18} color="#A855F7" />
        )}
        <Text style={[styles.activeText, isHost && styles.hostText]}>
          {isHost ? t('watchParty.hosting', 'Hosting') : t('watchParty.active', 'Active')}
        </Text>
        <View style={styles.pulseContainer}>
          <View style={[styles.pulseDot, isHost && styles.hostPulseDot]} />
          <Animated.View
            style={[
              styles.pulseRing,
              isHost && styles.hostPulseRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        </View>
      </Pressable>
    )
  }

  // Idle State with Dropdown
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        onFocus={tvFocus.handleFocus}
        onBlur={tvFocus.handleBlur}
        focusable={true}
        style={({ pressed }) => [
          styles.button,
          (isHovered || pressed) && styles.buttonHovered,
          tvFocus.isFocused && tvFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('watchParty.title', 'Watch Party')}
        accessibilityState={{ expanded: isOpen }}
        accessibilityHint={t('watchParty.buttonHint', 'Create or join a watch party')}
      >
        <Users size={isTV ? 22 : 18} color={colors.text} />
        <Text style={styles.buttonText}>{t('watchParty.title', 'Watch Party')}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={isTV ? 18 : 14} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {isOpen && (
        <View style={styles.dropdown}>
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onCreateClick()
            }}
            style={({ hovered, pressed }) => [
              styles.dropdownItem,
              (hovered || pressed) && styles.dropdownItemHovered,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('watchParty.create', 'Create Watch Party')}
          >
            <Plus size={isTV ? 22 : 18} color={colors.primary} />
            <Text style={styles.dropdownText}>{t('watchParty.create', 'Create')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onJoinClick()
            }}
            style={({ hovered, pressed }) => [
              styles.dropdownItem,
              (hovered || pressed) && styles.dropdownItemHovered,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('watchParty.join', 'Join Watch Party')}
          >
            <UserPlus size={isTV ? 22 : 18} color="#3B82F6" />
            <Text style={styles.dropdownText}>{t('watchParty.join', 'Join')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: isTV ? spacing.md : spacing.sm,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonHovered: {
    backgroundColor: colors.glassLight,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: isTV ? 16 : 13,
    fontWeight: '600',
    color: colors.text,
  },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: isTV ? spacing.md : spacing.sm,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassPurpleLight,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  hostButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  activeButtonHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: colors.primary,
  },
  activeText: {
    fontSize: isTV ? 16 : 13,
    fontWeight: '600',
    color: colors.primary,
  },
  hostText: {
    color: '#F59E0B',
  },
  pulseContainer: {
    position: 'relative',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
  },
  pulseDot: {
    position: 'absolute',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
    backgroundColor: '#A855F7',
  },
  hostPulseDot: {
    backgroundColor: '#F59E0B',
  },
  pulseRing: {
    position: 'absolute',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
    backgroundColor: '#A855F7',
  },
  hostPulseRing: {
    backgroundColor: '#F59E0B',
  },
  dropdown: {
    position: 'absolute',
    left: I18nManager.isRTL ? 'auto' : 0,
    right: I18nManager.isRTL ? 0 : 'auto',
    bottom: '100%',
    marginBottom: spacing.sm,
    width: isTV ? 240 : 192,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  dropdownItemHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  dropdownText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
})
