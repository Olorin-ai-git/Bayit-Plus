import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Users, Plus, UserPlus, ChevronDown } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface WatchPartyButtonProps {
  hasActiveParty: boolean
  onCreateClick: () => void
  onJoinClick: () => void
  onPanelToggle: () => void
}

export default function WatchPartyButton({
  hasActiveParty,
  onCreateClick,
  onJoinClick,
  onPanelToggle,
}: WatchPartyButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<View>(null)
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Close dropdown on outside click
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  if (hasActiveParty) {
    return (
      <Pressable
        onPress={onPanelToggle}
        style={({ hovered }) => [
          styles.activeButton,
          hovered && styles.activeButtonHovered,
        ]}
      >
        <Users size={18} color="#34D399" />
        <Text style={styles.activeText}>{t('watchParty.active')}</Text>
        <View style={styles.pulseContainer}>
          <View style={styles.pulseDot} />
          <View style={styles.pulseRing} />
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container} ref={dropdownRef}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={({ hovered }) => [
          styles.button,
          hovered && styles.buttonHovered,
        ]}
      >
        <Users size={18} color={colors.text} />
        <Text style={styles.buttonText}>{t('watchParty.title')}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={14} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {isOpen && (
        <GlassView style={styles.dropdown} intensity="high">
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onCreateClick()
            }}
            style={({ hovered }) => [
              styles.dropdownItem,
              hovered && styles.dropdownItemHovered,
            ]}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={styles.dropdownText}>{t('watchParty.create')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setIsOpen(false)
              onJoinClick()
            }}
            style={({ hovered }) => [
              styles.dropdownItem,
              hovered && styles.dropdownItemHovered,
            ]}
          >
            <UserPlus size={18} color="#3B82F6" />
            <Text style={styles.dropdownText}>{t('watchParty.join')}</Text>
          </Pressable>
        </GlassView>
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  buttonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  activeButtonHovered: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34D399',
  },
  pulseContainer: {
    position: 'relative',
    width: 8,
    height: 8,
  },
  pulseDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pulseRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    opacity: 0.75,
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    marginBottom: spacing.sm,
    width: 192,
    paddingVertical: spacing.xs,
    zIndex: 50,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    textAlign: 'right',
  },
  dropdownItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownText: {
    fontSize: 14,
    color: colors.text,
  },
})
