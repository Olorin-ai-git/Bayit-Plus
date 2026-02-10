/**
 * GlassLiveControlsPanel Component
 * Horizontal expandable glassmorphic panel for live channel controls
 * Contains Live Language Magic (premium), Live Translate, and Live Dubbing buttons
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Modal, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Maximize, Minimize, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { GlassView, GlassErrorBanner } from '@bayit/shared/ui'

// Minimum drag distance to trigger navigation
const DRAG_THRESHOLD = 30

// Carousel item wrapper with focus animation
interface CarouselItemProps {
  children: React.ReactNode
  isFocused: boolean
  index: number
}

function CarouselItem({ children, isFocused, index }: CarouselItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start()
  }, [isFocused, scaleAnim, glowAnim])

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.9)'],
  })

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.6],
  })

  return (
    <Animated.View
      style={[
        styles.carouselItem,
        {
          transform: [{ scale: scaleAnim }],
          borderColor,
          shadowOpacity,
          zIndex: isFocused ? 10 : 1,
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// Language flag emoji map
const LANG_FLAGS: Record<string, { isIconName: boolean; value: string }> = {
  he: { isIconName: false, value: '🇮🇱' },
  en: { isIconName: false, value: '🇺🇸' },
  ar: { isIconName: false, value: '🇸🇦' },
  es: { isIconName: false, value: '🇪🇸' },
  ru: { isIconName: false, value: '🇷🇺' },
  fr: { isIconName: false, value: '🇫🇷' },
  de: { isIconName: false, value: '🇩🇪' },
  it: { isIconName: false, value: '🇮🇹' },
  pt: { isIconName: false, value: '🇵🇹' },
  yi: { isIconName: true, value: 'synagogue' },
}

interface GlassLiveControlsPanelProps {
  isExpanded: boolean
  onToggleExpand: () => void
  currentLanguage: string
  availableLanguages: string[]
  onLanguageChange: (lang: string) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  isDubbingActive?: boolean
  onHoveredButtonChange?: (button: string | null) => void
  renderLiveSubtitleControls?: () => React.ReactNode
  renderLiveSplitSubtitleControls?: () => React.ReactNode
  renderDubbingControls?: () => React.ReactNode
  renderCatchUpButton?: () => React.ReactNode
  renderChannelChatButton?: () => React.ReactNode
  renderLiveTriviaButton?: () => React.ReactNode
  error?: string | null
  onDismissError?: () => void
}

export function GlassLiveControlsPanel({
  isExpanded,
  onToggleExpand,
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  isFullscreen,
  onToggleFullscreen,
  isDubbingActive = false,
  onHoveredButtonChange,
  renderLiveSubtitleControls,
  renderLiveSplitSubtitleControls,
  renderDubbingControls,
  renderCatchUpButton,
  renderChannelChatButton,
  renderLiveTriviaButton,
  error,
  onDismissError,
}: GlassLiveControlsPanelProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current
  const fullscreenFocus = useTVFocus({ styleType: 'button' })
  const MIN_PANEL_WIDTH = 140
  const MAX_PANEL_WIDTH = 1200
  const DEFAULT_EXPANDED_WIDTH = 820
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Carousel state
  const [focusedIndex, setFocusedIndex] = useState(0)
  const panelRef = useRef<View>(null)
  const [isCarouselHovered, setIsCarouselHovered] = useState(false)
  const [isAnyItemFocused, setIsAnyItemFocused] = useState(false)

  // Drag state for carousel navigation
  const carouselDragState = useRef({
    isDragging: false,
    startX: 0,
    currentX: 0,
  })

  // Build list of available carousel items
  const carouselItems = useMemo(() => {
    const items: { key: string; render: () => React.ReactNode }[] = []
    if (renderLiveSubtitleControls) {
      items.push({ key: 'liveSubtitle', render: renderLiveSubtitleControls })
    }
    if (renderLiveSplitSubtitleControls) {
      items.push({ key: 'liveSplitSubtitle', render: renderLiveSplitSubtitleControls })
    }
    if (renderDubbingControls) {
      items.push({ key: 'dubbing', render: renderDubbingControls })
    }
    if (renderCatchUpButton) {
      items.push({ key: 'catchUp', render: renderCatchUpButton })
    }
    if (renderChannelChatButton) {
      items.push({ key: 'channelChat', render: renderChannelChatButton })
    }
    if (renderLiveTriviaButton) {
      items.push({ key: 'liveTrivia', render: renderLiveTriviaButton })
    }
    return items
  }, [renderLiveSubtitleControls, renderLiveSplitSubtitleControls, renderDubbingControls, renderCatchUpButton, renderChannelChatButton, renderLiveTriviaButton])

  // Carousel navigation - wrap around
  const navigateCarousel = useCallback((direction: 'left' | 'right') => {
    if (!isExpanded || carouselItems.length === 0) return

    setFocusedIndex((prev) => {
      if (direction === 'right') {
        return (prev + 1) % carouselItems.length
      } else {
        return prev === 0 ? carouselItems.length - 1 : prev - 1
      }
    })
  }, [isExpanded, carouselItems.length])

  // Drag handlers for carousel
  const handleCarouselDragStart = useCallback((clientX: number) => {
    carouselDragState.current = {
      isDragging: true,
      startX: clientX,
      currentX: clientX,
    }
  }, [])

  const handleCarouselDragMove = useCallback((clientX: number) => {
    if (!carouselDragState.current.isDragging) return
    carouselDragState.current.currentX = clientX
  }, [])

  const handleCarouselDragEnd = useCallback(() => {
    if (!carouselDragState.current.isDragging) return

    const { startX, currentX } = carouselDragState.current
    const deltaX = currentX - startX

    // Only navigate if drag exceeds threshold
    if (Math.abs(deltaX) >= DRAG_THRESHOLD) {
      // Drag right = go left (previous), drag left = go right (next)
      navigateCarousel(deltaX > 0 ? 'left' : 'right')
    }

    carouselDragState.current = {
      isDragging: false,
      startX: 0,
      currentX: 0,
    }
  }, [navigateCarousel])

  // Set up drag event listeners on carousel container
  useEffect(() => {
    if (Platform.OS !== 'web' || !isExpanded) return

    const panel = panelRef.current as unknown as HTMLElement | null
    if (!panel) return

    const onMouseDown = (e: MouseEvent) => {
      handleCarouselDragStart(e.clientX)
    }

    const onMouseMove = (e: MouseEvent) => {
      handleCarouselDragMove(e.clientX)
    }

    const onMouseUp = () => {
      handleCarouselDragEnd()
    }

    const onMouseLeave = () => {
      handleCarouselDragEnd()
    }

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleCarouselDragStart(e.touches[0].clientX)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleCarouselDragMove(e.touches[0].clientX)
      }
    }

    const onTouchEnd = () => {
      handleCarouselDragEnd()
    }

    panel.addEventListener('mousedown', onMouseDown)
    panel.addEventListener('mousemove', onMouseMove)
    panel.addEventListener('mouseup', onMouseUp)
    panel.addEventListener('mouseleave', onMouseLeave)
    panel.addEventListener('touchstart', onTouchStart)
    panel.addEventListener('touchmove', onTouchMove)
    panel.addEventListener('touchend', onTouchEnd)

    return () => {
      panel.removeEventListener('mousedown', onMouseDown)
      panel.removeEventListener('mousemove', onMouseMove)
      panel.removeEventListener('mouseup', onMouseUp)
      panel.removeEventListener('mouseleave', onMouseLeave)
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
    }
  }, [isExpanded, handleCarouselDragStart, handleCarouselDragMove, handleCarouselDragEnd])

  // Keyboard navigation for carousel
  useEffect(() => {
    if (Platform.OS !== 'web' || !isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if panel or its children are focused
      const panel = panelRef.current as unknown as HTMLElement | null
      if (!panel) return

      // Check if focus is within the panel
      const activeElement = document.activeElement
      const isPanelFocused = panel.contains(activeElement) || panel === activeElement

      if (!isPanelFocused) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        navigateCarousel('right')
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        navigateCarousel('left')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, navigateCarousel])

  // Reset focus index when panel collapses or items change
  useEffect(() => {
    if (!isExpanded) {
      setFocusedIndex(0)
    } else if (focusedIndex >= carouselItems.length) {
      setFocusedIndex(Math.max(0, carouselItems.length - 1))
    }
  }, [isExpanded, carouselItems.length, focusedIndex])

  useEffect(() => {
    setDragWidth(null)
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isExpanded, expandAnim])

  const dragHandleRef = useRef<View>(null)

  useEffect(() => {
    // Drag handle only works on web platform
    if (Platform.OS !== 'web') return

    const node = dragHandleRef.current as unknown as HTMLElement | null
    if (!node) return

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true
      dragStartX.current = e.clientX
      dragStartWidth.current = dragWidth ?? (isExpanded ? DEFAULT_EXPANDED_WIDTH : MIN_PANEL_WIDTH)
      node.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, dragStartWidth.current + delta))
      setDragWidth(newWidth)
    }

    const onPointerUp = () => {
      isDragging.current = false
    }

    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('pointermove', onPointerMove)
    node.addEventListener('pointerup', onPointerUp)
    return () => {
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
    }
  }, [dragWidth, isExpanded])

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  })

  const languageDisplay = LANG_FLAGS[currentLanguage] || { isIconName: false, value: currentLanguage.toUpperCase() }
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  // Panel-level tooltip only for buttons that don't have their own GlassTooltip
  // Child controls (liveTranslate, liveDubbing) have tooltips via GlassLiveControlButton
  const getTooltipText = () => {
    switch (hoveredButton) {
      case 'flag':
        return t('player.selectOutputLanguage', 'Select Output Language')
      case 'expand':
        return isExpanded
          ? t('player.hideAIFeatures', 'Hide AI Features')
          : t('player.showAIFeatures', 'Show AI Features')
      case 'fullscreen':
        return isFullscreen
          ? t('player.exitFullscreen', 'Exit Fullscreen')
          : t('player.enterFullscreen', 'Enter Fullscreen')
      default:
        return null
    }
  }

  // Position tooltip near the hovered button, not centered on the full panel
  const getTooltipPositionStyle = () => {
    if (hoveredButton === 'fullscreen') {
      return { left: undefined, right: 0, transform: [] }
    }
    // flag and expand are at the left edge
    if (isExpanded) {
      return { left: 0, right: undefined, transform: [] }
    }
    // Collapsed: center over the small panel
    return { left: '50%', right: undefined, transform: [{ translateX: '-50%' }] }
  }

  const handleHoverChange = (button: string | null) => {
    setHoveredButton(button)
    onHoveredButtonChange?.(button)
  }

  const tooltipText = getTooltipText()

  return (
    <View style={styles.wrapper} data-controls-panel="true">
      {/* Error Banner - appears above the panel */}
      {error && onDismissError && (
        <GlassErrorBanner
          message={error}
          onDismiss={onDismissError}
          marginBottom={0}
          style={styles.errorBanner}
        />
      )}
      <Animated.View style={[styles.panelContainer, { width: dragWidth != null ? dragWidth : 'fit-content' as any }]}>
        {/* Glass background with single clean border */}
        <View style={styles.glassBackground}>
          <View style={styles.contentRow}>
            {/* AI Toggle Button */}
            <View style={styles.languageSettingsButton}>
              <Pressable
                onPress={() => setShowLanguagePicker(true)}
                onHoverIn={() => handleHoverChange('flag')}
                onHoverOut={() => handleHoverChange(null)}
                style={styles.flagBadge}
                accessibilityRole="button"
                accessibilityLabel={t('player.selectLanguage', 'Select Language')}
              >
                {languageDisplay.isIconName ? (
                  <Icon name={languageDisplay.value} size="md" color="#FFFFFF" />
                ) : (
                  <Text style={styles.flagText}>{languageDisplay.value}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={onToggleExpand}
                onHoverIn={() => {
                  setIsHovered(true)
                  handleHoverChange('expand')
                }}
                onHoverOut={() => {
                  setIsHovered(false)
                  handleHoverChange(null)
                }}
                style={[styles.expandButton, isHovered && styles.buttonHovered]}
                accessibilityRole="button"
                accessibilityLabel={t('player.liveLanguageMagic', 'Live Language Magic')}
                accessibilityState={{ expanded: isExpanded }}
              >
                <Sparkles
                  size={isTV ? 22 : 20}
                  color={isExpanded ? colors.primary.DEFAULT : colors.primary.DEFAULT}
                />
              </Pressable>
            </View>

            {/* Expanded Controls - Carousel */}
            {isExpanded && (
              <Pressable
                ref={panelRef as any}
                onHoverIn={() => setIsCarouselHovered(true)}
                onHoverOut={() => setIsCarouselHovered(false)}
                style={({ pressed }: { pressed?: boolean }) => [
                  styles.carouselContainer,
                  pressed && styles.carouselContainerDragging,
                ]}
              >
                <Animated.View
                  style={[styles.expandedControls, { opacity: contentOpacity }]}
                  tabIndex={0}
                  accessibilityRole="toolbar"
                  accessibilityLabel={t('player.liveControls', 'Live Controls')}
                >
                {/* Divider */}
                <View style={styles.divider} />

                {/* Left Arrow - visible when carousel or any item is hovered/focused */}
                {(isCarouselHovered || isAnyItemFocused) && carouselItems.length > 1 && (
                  <Pressable
                    onPress={() => navigateCarousel('left')}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.carouselArrow,
                      styles.carouselArrowLeft,
                      hovered && styles.carouselArrowHovered,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('player.previousControl', 'Previous control')}
                  >
                    <ChevronLeft size={16} color={colors.text} />
                  </Pressable>
                )}

                {/* Carousel Items */}
                {carouselItems.map((item, index) => (
                  <CarouselItem
                    key={item.key}
                    index={index}
                    isFocused={focusedIndex === index}
                  >
                    <Pressable
                      onFocus={() => { setFocusedIndex(index); setIsAnyItemFocused(true) }}
                      onBlur={() => setIsAnyItemFocused(false)}
                      onHoverIn={() => { setFocusedIndex(index); setIsAnyItemFocused(true) }}
                      onHoverOut={() => setIsAnyItemFocused(false)}
                      style={styles.controlItem}
                    >
                      {item.render()}
                    </Pressable>
                  </CarouselItem>
                ))}

                {/* Right Arrow - visible when carousel or any item is hovered/focused */}
                {(isCarouselHovered || isAnyItemFocused) && carouselItems.length > 1 && (
                  <Pressable
                    onPress={() => navigateCarousel('right')}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.carouselArrow,
                      styles.carouselArrowRight,
                      hovered && styles.carouselArrowHovered,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('player.nextControl', 'Next control')}
                  >
                    <ChevronRight size={16} color={colors.text} />
                  </Pressable>
                )}

                {/* Carousel navigation indicators */}
                {carouselItems.length > 1 && (
                  <View style={styles.carouselIndicators}>
                    {carouselItems.map((item, index) => (
                      <Pressable
                        key={`indicator-${item.key}`}
                        onPress={() => setFocusedIndex(index)}
                        style={[
                          styles.carouselDot,
                          focusedIndex === index && styles.carouselDotActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('player.goToControl', 'Go to control {{index}}', { index: index + 1 })}
                      />
                    ))}
                  </View>
                )}
                </Animated.View>
              </Pressable>
            )}
          </View>
          {/* Right-edge drag handle for resizing */}
          <View ref={dragHandleRef} style={styles.dragHandle} />
        </View>
      </Animated.View>

      {/* Fullscreen Button - Always visible outside the panel */}
      <Pressable
        onPress={onToggleFullscreen}
        onFocus={fullscreenFocus.handleFocus}
        onBlur={fullscreenFocus.handleBlur}
        onHoverIn={() => handleHoverChange('fullscreen')}
        onHoverOut={() => handleHoverChange(null)}
        focusable={true}
        style={({ hovered }: { hovered?: boolean }) => [
          styles.fullscreenButton,
          hovered && styles.buttonHovered,
          fullscreenFocus.isFocused && fullscreenFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isFullscreen ? t('player.exitFullscreen') : t('player.enterFullscreen')}
      >
        {isFullscreen ? (
          <Minimize size={isTV ? 24 : 20} color={colors.text} />
        ) : (
          <Maximize size={isTV ? 24 : 20} color={colors.text} />
        )}
      </Pressable>

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <Modal
          visible={showLanguagePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowLanguagePicker(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <GlassView style={styles.languagePickerContainer} intensity="high">
                {/* Header */}
                <View style={styles.languagePickerHeader}>
                  <Text style={styles.languagePickerTitle}>
                    {t('player.selectLanguage', 'Select Language')}
                  </Text>
                  <Pressable
                    onPress={() => setShowLanguagePicker(false)}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close', 'Close')}
                  >
                    <X size={20} color={colors.text} />
                  </Pressable>
                </View>

                {/* Language List */}
                <View style={styles.languageList}>
                  {availableLanguages.map((lang) => {
                    const langDisplay = LANG_FLAGS[lang] || { isIconName: false, value: lang.toUpperCase() }
                    const isSelected = lang === currentLanguage
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => {
                          onLanguageChange(lang)
                          setShowLanguagePicker(false)
                        }}
                        style={[
                          styles.languageItem,
                          isSelected && styles.languageItemSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t(`languages.${lang}`, lang.toUpperCase())}
                        accessibilityState={{ selected: isSelected }}
                      >
                        {langDisplay.isIconName ? (
                          <Icon name={langDisplay.value} size="lg" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.languageFlag}>{langDisplay.value}</Text>
                        )}
                        <Text style={styles.languageName}>
                          {t(`languages.${lang}`, lang.toUpperCase())}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Icon name="check" size="sm" color={colors.text} />
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </GlassView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Glass Tooltip Above Container - positioned near hovered button */}
      {tooltipText && (
        <GlassView style={[styles.tooltip, getTooltipPositionStyle()]} intensity="high">
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </GlassView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorBanner: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: spacing.sm,
    maxWidth: 360,
    zIndex: 1000,
  },
  panelContainer: {
    height: isTV ? 56 : 48,
    position: 'relative',
    overflow: 'visible',
  },
  glassBackground: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' as any }),
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'visible',
  },
  dragHandle: {
    width: 6,
    alignSelf: 'stretch',
    ...(Platform.OS === 'web' && { cursor: 'ew-resize' as any }),
    backgroundColor: 'transparent',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  languageSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  flagBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  flagText: {
    fontSize: 18,
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' && { cursor: 'grab' as any }),
  },
  carouselContainerDragging: {
    ...(Platform.OS === 'web' && { cursor: 'grabbing' as any }),
  },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
    paddingLeft: spacing.sm,
  },
  divider: {
    width: 1.5,
    height: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    marginRight: spacing.xs,
  },
  controlItem: {
    flexShrink: 0,
  },
  carouselItem: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
  carouselIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.md,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139, 92, 246, 0.25)',
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  carouselDotActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carouselArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  carouselArrowLeft: {
    marginRight: spacing.xs,
  },
  carouselArrowRight: {
    marginLeft: spacing.xs,
  },
  carouselArrowHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.5)',
    borderColor: 'rgba(139, 92, 246, 0.8)',
    transform: [{ scale: 1.1 }],
  },
  fullscreenButton: {
    width: isTV ? 56 : 44,
    height: isTV ? 56 : 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  languagePickerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 500,
  },
  languagePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  languagePickerTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  languageList: {
    gap: spacing.xs,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  languageItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  languageFlag: {
    fontSize: isTV ? 28 : 24,
  },
  languageName: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 160,
    zIndex: 1000,
  },
  tooltipText: {
    color: colors.text,
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' as any }),
  },
})

export default GlassLiveControlsPanel
