/**
 * ProgressBar Component
 * Displays video progress with seek functionality and draggable handle
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { View, Text, StyleSheet } from 'react-native'
import { colors, borderRadius, spacing } from '@olorin/design-tokens'
import { GlassView } from '@bayit/shared/ui'
import ChapterTimeline from './ChapterTimeline'
import { Chapter } from './types'

interface ProgressBarProps {
  currentTime: number
  duration: number
  chapters?: Chapter[]
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void
  onChapterSeek?: (time: number) => void
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export default function ProgressBar({
  currentTime,
  duration,
  chapters = [],
  onSeek,
  onChapterSeek,
}: ProgressBarProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverTime, setHoverTime] = useState(0)
  const [hoverPosition, setHoverPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleMouseMove = (e: MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const time = (percentage / 100) * duration

    setHoverPosition(percentage)
    setHoverTime(time)

    // If dragging, continuously seek to new position
    if (isDragging) {
      const syntheticEvent = {
        ...e,
        currentTarget: container,
        target: container,
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as React.MouseEvent<HTMLDivElement>

      onSeek(syntheticEvent)
    }
  }

  const handleMouseEnter = () => setIsHovering(true)
  const handleMouseLeave = () => {
    setIsHovering(false)
    setIsDragging(false)
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const container = containerRef.current
    if (!container) return

    // Create a proper synthetic event for onSeek
    const syntheticEvent = {
      ...e,
      currentTarget: container,
      target: container,
      clientX: e.clientX,
      clientY: e.clientY,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
    } as React.MouseEvent<HTMLDivElement>

    onSeek(syntheticEvent)
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleClick = (e: MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    // Create a proper synthetic event for onSeek
    const syntheticEvent = {
      ...e,
      currentTarget: container,
      target: container,
      clientX: e.clientX,
      clientY: e.clientY,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
    } as React.MouseEvent<HTMLDivElement>

    onSeek(syntheticEvent)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const moveHandler = (e: MouseEvent) => {
      if (!containerRef.current) return
      handleMouseMove(e)
    }

    const downHandler = (e: MouseEvent) => {
      if (!containerRef.current) return
      handleMouseDown(e)
    }

    const upHandler = () => handleMouseUp()

    const clickHandler = (e: MouseEvent) => {
      if (!containerRef.current) return
      handleClick(e)
    }

    container.addEventListener('mousemove', moveHandler)
    container.addEventListener('mousedown', downHandler)
    container.addEventListener('mouseup', upHandler)
    container.addEventListener('click', clickHandler)
    document.addEventListener('mouseup', upHandler)

    return () => {
      container.removeEventListener('mousemove', moveHandler)
      container.removeEventListener('mousedown', downHandler)
      container.removeEventListener('mouseup', upHandler)
      container.removeEventListener('click', clickHandler)
      document.removeEventListener('mouseup', upHandler)
    }
  }, [duration])

  // Add global mousemove listener when dragging
  useEffect(() => {
    if (!isDragging) return

    const globalMoveHandler = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      const time = (percentage / 100) * duration

      setHoverPosition(percentage)
      setHoverTime(time)

      const syntheticEvent = {
        ...e,
        currentTarget: container,
        target: container,
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as React.MouseEvent<HTMLDivElement>

      onSeek(syntheticEvent)
    }

    document.addEventListener('mousemove', globalMoveHandler)
    return () => {
      document.removeEventListener('mousemove', globalMoveHandler)
    }
  }, [isDragging, duration, onSeek])

  // Render tooltip in portal to avoid z-index issues
  const renderTooltip = () => {
    if (!containerRef.current || (!isHovering && !isDragging)) return null

    const rect = containerRef.current.getBoundingClientRect()
    const tooltipX = rect.left + (rect.width * hoverPosition) / 100

    return createPortal(
      <div
        style={{
          position: 'fixed',
          left: `${tooltipX}px`,
          top: `${rect.top - 40}px`,
          transform: 'translateX(-50%)',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        <GlassView style={styles.tooltipContent} intensity="high">
          <Text style={styles.tooltipText}>{formatTime(hoverTime)}</Text>
        </GlassView>
      </div>,
      document.body
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        style={{
          ...styles.container as any,
          ...(isHovering || isDragging ? styles.containerHovered as any : {}),
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {chapters.length > 0 && onChapterSeek && (
          <ChapterTimeline
            chapters={chapters}
            duration={duration}
            currentTime={currentTime}
            onSeek={onChapterSeek}
          />
        )}

        <View style={styles.track}>
          <View
            style={[
              styles.progress,
              {
                width: `${progress}%`,
                backgroundColor: colors.primary.DEFAULT,
                shadowColor: colors.primary.DEFAULT,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
              }
            ]}
          />

          {/* Draggable handle */}
          <View
            style={[
              styles.handle,
              { left: `${progress}%` },
              (isHovering || isDragging) && styles.handleVisible
            ]}
          />
        </View>
      </div>

      {/* Tooltip rendered via portal */}
      {renderTooltip()}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    position: 'relative',
    cursor: 'pointer',
    paddingVertical: spacing.sm,
    marginVertical: -spacing.sm,
  },
  containerHovered: {
    height: 8,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    overflow: 'visible',
    position: 'relative',
  },
  progress: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  handle: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7,
    marginTop: -7,
    opacity: 0,
    transform: [{ scale: 0 }],
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  } as any,
  handleVisible: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  tooltipPortal: {
    position: 'fixed' as any,
    transform: [{ translateX: '-50%' }],
    zIndex: 10000,
    pointerEvents: 'none',
  },
  tooltipContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 60,
  },
  tooltipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  } as any,
})
