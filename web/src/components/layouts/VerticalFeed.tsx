import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

interface FeedItem {
  id?: string
  title: string
  description?: string
  category?: string
  duration?: number
  type?: string
  stream_url?: string
  url?: string
  thumbnail?: string
}

interface VerticalFeedProps {
  items?: FeedItem[]
  onItemChange?: (item: FeedItem, index: number) => void
  onItemPress?: (item: FeedItem, index: number) => void
  renderItem?: (item: FeedItem, index: number, isActive: boolean) => ReactNode
  autoPlay?: boolean
  showProgress?: boolean
}

/**
 * VerticalFeed Layout
 * TikTok-style vertical swipe navigation for mobile/phone layouts.
 * Auto-plays short content clips as users swipe through.
 */
export default function VerticalFeed({
  items = [],
  onItemChange,
  onItemPress,
  renderItem,
  autoPlay = true,
  showProgress = true,
}: VerticalFeedProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [progress, setProgress] = useState(0)
  const containerRef = useRef<View>(null)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})
  const translateY = useRef(new Animated.Value(0)).current

  const currentItem = items[currentIndex]

  // Handle touch gestures
  const handleTouchStart = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.touches?.[0]
    if (touch) {
      setTouchStart(touch.clientY)
      setTouchEnd(touch.clientY)
    }
  }

  const handleTouchMove = (e: any) => {
    const touch = e.nativeEvent?.touches?.[0] || e.touches?.[0]
    if (touch) {
      setTouchEnd(touch.clientY)
    }
  }

  const handleTouchEnd = () => {
    const swipeThreshold = 50
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        goToNext()
      } else {
        goToPrevious()
      }
    }
  }

  // Handle wheel scroll on desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isTransitioning) return

    if (e.deltaY > 0) {
      goToNext()
    } else if (e.deltaY < 0) {
      goToPrevious()
    }
  }, [isTransitioning])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext()
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevious()
      } else if (e.key === 'Enter' || e.key === ' ') {
        handleItemPress()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, items])

  // Add wheel listener
  useEffect(() => {
    const container = containerRef.current as any
    if (container) {
      container.addEventListener?.('wheel', handleWheel, { passive: true })
      return () => container.removeEventListener?.('wheel', handleWheel)
    }
  }, [handleWheel])

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [currentIndex, items.length, isTransitioning])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [currentIndex, isTransitioning])

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length && index !== currentIndex) {
      setIsTransitioning(true)
      setCurrentIndex(index)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }, [items.length, currentIndex])

  // Notify parent of item changes
  useEffect(() => {
    if (currentItem) {
      onItemChange?.(currentItem, currentIndex)
    }
  }, [currentIndex, currentItem, onItemChange])

  // Auto-advance for clips with duration
  useEffect(() => {
    if (!autoPlay || !currentItem?.duration) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / currentItem.duration!)
        if (next >= 100) {
          goToNext()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentIndex, currentItem, autoPlay, goToNext])

  const handleItemPress = () => {
    if (currentItem) {
      onItemPress?.(currentItem, currentIndex)
    }
  }

  // Default item renderer
  const defaultRenderItem = (item: FeedItem, index: number, isActive: boolean) => (
    <View style={[styles.feedItem, isActive && styles.feedItemActive]}>
      {item.type === 'video' || item.stream_url ? (
        <video
          ref={(el) => (videoRefs.current[index] = el)}
          src={item.stream_url || item.url}
          poster={item.thumbnail}
          muted
          playsInline
          loop
          autoPlay={isActive && autoPlay}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.feedThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.feedThumbnail} />
      )}

      <View style={styles.feedOverlay}>
        <View style={styles.feedContent}>
          <Text style={styles.feedTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.feedDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.feedMeta}>
            {item.category && (
              <Text style={styles.feedCategory}>{item.category}</Text>
            )}
            {item.duration && (
              <Text style={styles.feedDuration}>
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.feedActions}>
          <Pressable
            style={({ hovered }) => [
              styles.actionButton,
              hovered && styles.actionButtonHovered,
            ]}
            onPress={() => navigate(`/watch/${item.id}`)}
          >
            <Text style={styles.actionIcon}>▶️</Text>
            <Text style={styles.actionLabel}>צפה</Text>
          </Pressable>
          <Pressable
            style={({ hovered }) => [
              styles.actionButton,
              hovered && styles.actionButtonHovered,
            ]}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>שמור</Text>
          </Pressable>
          <Pressable
            style={({ hovered }) => [
              styles.actionButton,
              hovered && styles.actionButtonHovered,
            ]}
          >
            <Text style={styles.actionIcon}>↗️</Text>
            <Text style={styles.actionLabel}>שתף</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )

  if (!items.length) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>אין תוכן להצגה</Text>
        </View>
      </View>
    )
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Items Container */}
      <Animated.View
        style={[
          styles.feedContainer,
          {
            transform: [{ translateY: Animated.multiply(new Animated.Value(-currentIndex * 100), new Animated.Value(1)) }],
          },
        ]}
      >
        {items.map((item, index) => (
          <Pressable
            key={item.id || index}
            style={styles.feedSlide}
            onPress={handleItemPress}
          >
            {renderItem
              ? renderItem(item, index, index === currentIndex)
              : defaultRenderItem(item, index, index === currentIndex)
            }
          </Pressable>
        ))}
      </Animated.View>

      {/* Progress Bar */}
      {showProgress && currentItem?.duration && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      )}

      {/* Navigation Dots */}
      <View style={styles.feedDots}>
        {items.slice(
          Math.max(0, currentIndex - 2),
          Math.min(items.length, currentIndex + 3)
        ).map((_, i) => {
          const actualIndex = Math.max(0, currentIndex - 2) + i
          return (
            <Pressable
              key={actualIndex}
              style={[
                styles.dot,
                actualIndex === currentIndex && styles.dotActive,
              ]}
              onPress={() => goToIndex(actualIndex)}
            />
          )
        })}
      </View>

      {/* Swipe Hints */}
      <View style={styles.swipeHints}>
        {currentIndex > 0 && (
          <View style={[styles.hint, styles.hintUp]}>
            <Text style={styles.hintText}>↑</Text>
          </View>
        )}
        {currentIndex < items.length - 1 && (
          <View style={[styles.hint, styles.hintDown]}>
            <Text style={styles.hintText}>↓</Text>
          </View>
        )}
      </View>

      {/* Counter */}
      <GlassView style={styles.feedCounter} intensity="low">
        <Text style={styles.counterText}>
          {currentIndex + 1} / {items.length}
        </Text>
      </GlassView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  feedContainer: {
    flex: 1,
  },
  feedSlide: {
    height: '100%',
    width: '100%',
  },
  feedItem: {
    flex: 1,
    position: 'relative',
  },
  feedItemActive: {
    // Active state styles if needed
  },
  feedThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  feedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    backgroundColor: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))' as any,
  },
  feedContent: {
    marginBottom: spacing.lg,
  },
  feedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  feedDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  feedMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  feedCategory: {
    fontSize: 12,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  feedDuration: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  feedActions: {
    flexDirection: 'column',
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl * 3,
    gap: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  feedDots: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    height: 20,
    borderRadius: 4,
  },
  swipeHints: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    position: 'absolute',
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  hintUp: {
    top: spacing.xl,
  },
  hintDown: {
    bottom: spacing.xl,
  },
  hintText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  feedCounter: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  counterText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
})
