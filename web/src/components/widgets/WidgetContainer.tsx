/**
 * WidgetContainer - Draggable floating widget overlay
 *
 * Displays video, audio, or iframe content in a picture-in-picture style overlay.
 * Supports drag-and-drop repositioning, mute/unmute, and close functionality.
 * Supports multiple content types: live_channel, live, vod, podcast, radio, iframe.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { X, Volume2, VolumeX, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import { YnetMivzakimWidget } from './YnetMivzakimWidget';
import { useDirection } from '@/hooks/useDirection';
import type { Widget, WidgetPosition } from '@/types/widget';

interface WidgetContainerProps {
  widget: Widget;
  isMuted: boolean;
  position: WidgetPosition;
  onToggleMute: () => void;
  onClose: () => void;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  streamUrl?: string;
}

// Check if this is a TV build
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const WIDGET_MOVE_STEP = 20; // pixels per arrow key press on TV

export default function WidgetContainer({
  widget,
  isMuted,
  position,
  onToggleMute,
  onClose,
  onPositionChange,
  streamUrl,
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isRTL } = useDirection();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(!streamUrl && widget.content.content_type !== 'iframe' && widget.content.content_type !== 'custom');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(IS_TV_BUILD); // Start focused on TV
  const [isMinimized, setIsMinimized] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{ x: number; y: number } | null>(null);

  // Minimized widget dimensions
  const MINIMIZED_HEIGHT = 40;
  const MINIMIZED_WIDTH = 200;

  // Update loading state when stream URL changes
  useEffect(() => {
    if (widget.content.content_type === 'iframe' || widget.content.content_type === 'custom') {
      setLoading(false);
      return;
    }

    if (streamUrl) {
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
    }
  }, [streamUrl, widget.content.content_type]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!widget.is_draggable) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    e.preventDefault();
  }, [widget.is_draggable]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const maxX = window.innerWidth - position.width;
    const maxY = window.innerHeight - position.height;

    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, maxX));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, maxY));

    onPositionChange({ x: newX, y: newY });
  }, [isDragging, dragOffset, position.width, position.height, onPositionChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Minimize widget to bottom of screen
  const handleMinimize = useCallback(() => {
    // Save current position before minimizing
    setSavedPosition({ x: position.x, y: position.y });
    setIsMinimized(true);
  }, [position.x, position.y]);

  // Restore widget to original position
  const handleRestore = useCallback(() => {
    setIsMinimized(false);
    // Restore saved position if available
    if (savedPosition) {
      onPositionChange({ x: savedPosition.x, y: savedPosition.y });
    }
  }, [savedPosition, onPositionChange]);

  // Global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // TV Remote control handler
  useEffect(() => {
    if (!IS_TV_BUILD || !isFocused) return;

    const handleRemoteKey = (e: KeyboardEvent) => {
      // Arrow keys for moving widget
      if (widget.is_draggable) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            onPositionChange({
              x: Math.max(0, position.x - WIDGET_MOVE_STEP)
            });
            break;
          case 'ArrowRight':
            e.preventDefault();
            onPositionChange({
              x: Math.min(window.innerWidth - position.width, position.x + WIDGET_MOVE_STEP)
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            onPositionChange({
              y: Math.max(0, position.y - WIDGET_MOVE_STEP)
            });
            break;
          case 'ArrowDown':
            e.preventDefault();
            onPositionChange({
              y: Math.min(window.innerHeight - position.height, position.y + WIDGET_MOVE_STEP)
            });
            break;
        }
      }

      // Enter/OK button to toggle mute
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleMute();
      }

      // 0/Red button to close (Samsung TV remote)
      if (e.key === '0' || e.key === 'Escape') {
        e.preventDefault();
        if (widget.is_closable) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleRemoteKey);
    return () => window.removeEventListener('keydown', handleRemoteKey);
  }, [IS_TV_BUILD, isFocused, widget.is_draggable, widget.is_closable, position, onToggleMute, onClose, onPositionChange]);

  // Render loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  // Render error state
  const renderError = (errorMessage: string) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{errorMessage}</Text>
    </View>
  );

  // Render content based on type
  const renderContent = () => {
    // Show loading state while fetching stream URL (unless it's iframe)
    if (loading) {
      return renderLoading();
    }

    const { content_type } = widget.content;

    try {
      switch (content_type) {
        case 'live_channel':
        case 'live':
          if (!streamUrl) {
            return renderError('Stream unavailable');
          }
          return (
            <div style={styles.playerWrapper as any}>
              <VideoPlayer
                src={streamUrl}
                title={widget.title}
                isLive={true}
                autoPlay={!isMuted}
              />
            </div>
          );

        case 'vod':
          if (!streamUrl) {
            return renderError('Content unavailable');
          }
          return (
            <div style={styles.playerWrapper as any}>
              <VideoPlayer
                src={streamUrl}
                title={widget.title}
                isLive={false}
                autoPlay={!isMuted}
              />
            </div>
          );

        case 'podcast':
          if (!streamUrl) {
            return renderError('Podcast unavailable');
          }
          return (
            <div style={styles.playerWrapper as any}>
              <AudioPlayer
                src={streamUrl}
                title={widget.title}
                cover={widget.cover_url || widget.icon}
                isLive={false}
              />
            </div>
          );

        case 'radio':
          if (!streamUrl) {
            return renderError('Station unavailable');
          }
          return (
            <div style={styles.playerWrapper as any}>
              <AudioPlayer
                src={streamUrl}
                title={widget.title}
                cover={widget.cover_url || widget.icon}
                isLive={true}
              />
            </div>
          );

        case 'iframe':
          if (!widget.content.iframe_url) {
            return renderError('iFrame URL not configured');
          }
          return (
            <iframe
              src={widget.content.iframe_url}
              title={widget.content.iframe_title || widget.title}
              style={styles.iframe as any}
              sandbox="allow-scripts allow-same-origin"
              allow="autoplay; encrypted-media"
            />
          );

        case 'custom':
          // Render custom React components based on component_name
          const componentName = widget.content.component_name;
          // Also check by title as fallback for widgets not yet migrated
          const isYnetWidget = componentName === 'ynet_mivzakim' ||
            widget.title.includes('Ynet') ||
            widget.title.includes('מבזקי');

          if (isYnetWidget) {
            return <YnetMivzakimWidget />;
          }
          return renderError(`Unknown component: ${componentName}`);

        default:
          return renderError('No content configured');
      }
    } catch (err) {
      console.error('[Widget] Error rendering content:', err);
      return renderError('Error loading content');
    }
  };

  // Calculate position for minimized state
  const minimizedIndex = 0; // Could be passed as prop for stacking multiple minimized widgets
  const minimizedX = isRTL ? window.innerWidth - MINIMIZED_WIDTH - 20 - (minimizedIndex * (MINIMIZED_WIDTH + 10)) : 20 + (minimizedIndex * (MINIMIZED_WIDTH + 10));
  const minimizedY = window.innerHeight - MINIMIZED_HEIGHT - 20;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: isMinimized ? minimizedX : position.x,
        top: isMinimized ? minimizedY : position.y,
        width: isMinimized ? MINIMIZED_WIDTH : position.width,
        height: isMinimized ? MINIMIZED_HEIGHT : position.height,
        zIndex: position.z_index,
        cursor: isDragging ? 'grabbing' : IS_TV_BUILD ? 'pointer' : 'default',
        // TV: Always show focus indicator
        outline: IS_TV_BUILD && isFocused ? '2px solid #00aaff' : 'none',
        outlineOffset: '2px',
        transition: isMinimized || savedPosition ? 'all 0.3s ease' : 'none',
      }}
      onFocus={() => IS_TV_BUILD && setIsFocused(true)}
      onBlur={() => IS_TV_BUILD && setIsFocused(false)}
      tabIndex={IS_TV_BUILD ? 0 : -1}
      role="button"
      aria-label={`Widget: ${widget.title}`}
    >
      <View style={styles.container}>
        {/* Header Bar - Always visible, entire bar is draggable */}
        <div
          style={{
            ...styles.headerBar as any,
            flexDirection: 'row', // Controls on left, title on right
            cursor: widget.is_draggable && !isMinimized ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onMouseDown={widget.is_draggable && !isMinimized && !IS_TV_BUILD ? (handleDragStart as any) : undefined}
        >
          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Minimize/Restore Button */}
            <Pressable
              style={styles.controlButton}
              onPress={isMinimized ? handleRestore : handleMinimize}
            >
              {isMinimized ? (
                <Maximize2 size={14} color={colors.text} />
              ) : (
                <Minimize2 size={14} color={colors.text} />
              )}
            </Pressable>

            {/* Mute Button */}
            <Pressable style={styles.controlButton} onPress={onToggleMute}>
              {isMuted ? (
                <VolumeX size={14} color={colors.text} />
              ) : (
                <Volume2 size={14} color={colors.text} />
              )}
            </Pressable>

            {/* Close Button */}
            {widget.is_closable && (
              <Pressable style={styles.controlButton} onPress={onClose}>
                <X size={14} color={colors.text} />
              </Pressable>
            )}
          </View>

          {/* Drag indicator in center - only when not minimized */}
          {widget.is_draggable && !isMinimized && (
            <View style={styles.dragIndicator}>
              {IS_TV_BUILD ? (
                <Text style={styles.tvControlText}>⬅️ ⬆️ ⬇️ ➡️</Text>
              ) : (
                <GripHorizontal size={16} color="rgba(255,255,255,0.4)" />
              )}
            </View>
          )}

          {/* Title */}
          <View style={styles.titleContainer}>
            {widget.icon && <Text style={styles.icon}>{widget.icon}</Text>}
            <Text style={styles.title} numberOfLines={1}>{widget.title}</Text>
          </View>
        </div>

        {/* Content - hidden when minimized */}
        {!isMinimized && (
          <View style={[
            styles.contentWrapper,
            // Use transparent background for audio content (podcast, radio) since AudioPlayer has its own glass styling
            (widget.content.content_type === 'podcast' || widget.content.content_type === 'radio') && styles.contentWrapperTransparent,
          ]}>
            {renderContent()}
          </View>
        )}
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 35, 0.85)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    // @ts-ignore - Web CSS
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
  } as any,
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 36,
    display: 'flex',
    userSelect: 'none',
  } as any,
  contentWrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: '#000',
    display: 'flex',
  } as any,
  contentWrapperTransparent: {
    backgroundColor: 'transparent',
  },
  playerWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flex: 1,
  } as any,
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: colors.text,
    // @ts-ignore - Web CSS
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dragIndicator: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -8 }],
    opacity: 0.6,
  } as any,
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    maxWidth: '40%',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  controlButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tvControlText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
