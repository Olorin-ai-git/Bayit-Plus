/**
 * GlassChatSidebar Component
 *
 * Animated slide-in/out sidebar wrapping ChannelChatPanel.
 * Matches GlassSidebar spring animation pattern.
 * Supports RTL layout (slides from left when RTL).
 * Escape key and backdrop click dismiss the sidebar.
 */

import { useEffect, useRef, useCallback } from 'react'
import { View, Pressable, Animated, StyleSheet } from 'react-native'
import { X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import ChannelChatPanel from './ChannelChatPanel'

interface GlassChatSidebarProps {
  channelId: string
  isLiveChannel: boolean
  isVisible: boolean
  onClose: () => void
}

const SIDEBAR_WIDTH = 340

export default function GlassChatSidebar({
  channelId,
  isLiveChannel,
  isVisible,
  onClose,
}: GlassChatSidebarProps) {
  const { isRTL } = useDirection()
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current
  const backdropAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: false,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SIDEBAR_WIDTH,
          friction: 8,
          tension: 65,
          useNativeDriver: false,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start()
    }
  }, [isVisible, slideAnim, backdropAnim])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) onClose()
  }, [isVisible, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const translateStyle = isRTL
    ? { transform: [{ translateX: Animated.multiply(slideAnim, -1) }] }
    : { transform: [{ translateX: slideAnim }] }

  const positionStyle = isRTL ? { left: 0 } : { right: 0 }

  // Prevent click events from propagating to video player
  // But allow clicks on input elements to work normally
  const handleSidebarClick = useCallback((e: any) => {
    // Don't stop propagation if clicking on input, textarea, or button elements
    const target = e?.target
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON'
    )) {
      return
    }
    e?.stopPropagation?.()
  }, [])

  return (
    <>
      {/* Semi-transparent backdrop */}
      {isVisible && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: Animated.multiply(backdropAnim, 0.4) },
          ]}
        >
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>
      )}

      {/* Sidebar panel */}
      <Animated.View
        style={[
          styles.sidebar,
          positionStyle,
          translateStyle,
        ]}
        onClick={handleSidebarClick}
      >
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={[
            styles.closeButton,
            isRTL ? { right: spacing.sm } : { left: spacing.sm },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close chat"
        >
          <X size={18} color={colors.text} />
        </Pressable>

        <ChannelChatPanel
          channelId={channelId}
          isLiveChannel={isLiveChannel}
        />
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 49,
  },
  backdropPress: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'rgba(10, 10, 20, 0.3)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: borderRadius.lg,
    zIndex: 50,
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: spacing.xl,
  } as any,
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    zIndex: 51,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
