/**
 * WidgetContainer - Draggable floating widget overlay
 *
 * Displays video, audio, or iframe content in a picture-in-picture style overlay.
 * Supports drag-and-drop repositioning, mute/unmute, and close functionality.
 * Supports multiple content types: live_channel, live, vod, podcast, radio, iframe.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { X, Volume2, VolumeX, GripHorizontal, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import VideoPlayer from '@/components/player/VideoPlayer';
import AudioPlayer from '@/components/player/AudioPlayer';
import { YnetMivzakimWidget } from './YnetMivzakimWidget';
import { useDirection } from '@/hooks/useDirection';
import type { Widget, WidgetPosition } from '@/types/widget';
import type { PodcastEpisode } from '@/types/podcast';
import logger from '@/utils/logger';

interface WidgetContainerProps {
  widget: Widget;
  isMuted: boolean;
  isMinimized: boolean;
  position: WidgetPosition;
  onToggleMute: () => void;
  onClose: () => void;
  onToggleMinimize: () => void;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  streamUrl?: string;
  episodeData?: PodcastEpisode;
}

// Check if this is a TV build
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const WIDGET_MOVE_STEP = 20; // pixels per arrow key press on TV

export default function WidgetContainer({
  widget,
  isMuted,
  isMinimized,
  position,
  onToggleMute,
  onClose,
  onToggleMinimize,
  onPositionChange,
  streamUrl,
  episodeData,
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isRTL } = useDirection();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(!streamUrl && widget.content.content_type !== 'iframe' && widget.content.content_type !== 'custom');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(IS_TV_BUILD); // Start focused on TV
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setLastUpdated(new Date());
  }, []);

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

  // Toggle minimize state (positioning handled by store)
  const handleToggleMinimize = useCallback(() => {
    onToggleMinimize();
  }, [onToggleMinimize]);

  // Parse DD/MM/YYYY date format
  const parseDDMMYYYY = useCallback((dateStr: string): Date | null => {
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);

      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

      return new Date(year, month, day);
    } catch {
      return null;
    }
  }, []);

  // Format last updated time or episode broadcast date
  const formatTimestamp = useCallback(() => {
    console.log('formatTimestamp called:', {
      contentType: widget.content.content_type,
      hasEpisodeData: !!episodeData,
      episodeData,
      publishedAt: episodeData?.publishedAt
    });

    // For podcasts, show episode broadcast date if available
    if (widget.content.content_type === 'podcast' && episodeData?.publishedAt) {
      // Parse DD/MM/YYYY format
      const publishedDate = parseDDMMYYYY(episodeData.publishedAt);

      if (publishedDate) {
        // Normalize both dates to midnight for accurate day comparison
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        const publishedMidnight = new Date(publishedDate);
        publishedMidnight.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((todayMidnight.getTime() - publishedMidnight.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 0 && diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 0) return 'Upcoming'; // Future date
        return publishedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    // For other content types, show last updated time
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated, widget.content.content_type, episodeData, parseDDMMYYYY]);

  // Update timestamp display every minute
  const [, setUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Resize handlers
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 150;

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    };
  }, [position.width, position.height]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current || !resizeDirection) return;

    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    const updates: Partial<WidgetPosition> = {};

    // Calculate current position (use updates if set, otherwise use current position)
    let currentX = position.x;
    let currentY = position.y;

    // Handle horizontal resize
    if (resizeDirection.includes('e')) {
      // Resizing from right edge - constrain width to stay within screen
      const maxWidth = window.innerWidth - position.x;
      updates.width = Math.max(MIN_WIDTH, Math.min(maxWidth, resizeStartRef.current.width + deltaX));
    } else if (resizeDirection.includes('w')) {
      // Resizing from left edge - adjust position and width
      const newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.width - deltaX);
      const widthChange = resizeStartRef.current.width - newWidth;
      const newX = position.x + widthChange;

      // Ensure widget doesn't go off left edge
      if (newX >= 0) {
        updates.width = newWidth;
        updates.x = newX;
        currentX = newX;
      }
    }

    // Handle vertical resize
    if (resizeDirection.includes('s')) {
      // Resizing from bottom edge - constrain height to stay within screen
      const maxHeight = window.innerHeight - position.y;
      updates.height = Math.max(MIN_HEIGHT, Math.min(maxHeight, resizeStartRef.current.height + deltaY));
    } else if (resizeDirection.includes('n')) {
      // Resizing from top edge - adjust position and height
      const newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.height - deltaY);
      const heightChange = resizeStartRef.current.height - newHeight;
      const newY = position.y + heightChange;

      // Ensure widget doesn't go off top edge
      if (newY >= 0) {
        updates.height = newHeight;
        updates.y = newY;
        currentY = newY;
      }
    }

    // Final validation: ensure widget stays fully on screen
    if (updates.width !== undefined || updates.x !== undefined) {
      const finalX = updates.x ?? currentX;
      const finalWidth = updates.width ?? position.width;

      // Clamp width to prevent right edge going off screen
      if (finalX + finalWidth > window.innerWidth) {
        updates.width = window.innerWidth - finalX;
      }
    }

    if (updates.height !== undefined || updates.y !== undefined) {
      const finalY = updates.y ?? currentY;
      const finalHeight = updates.height ?? position.height;

      // Clamp height to prevent bottom edge going off screen
      if (finalY + finalHeight > window.innerHeight) {
        updates.height = window.innerHeight - finalY;
      }
    }

    if (Object.keys(updates).length > 0) {
      onPositionChange(updates);
    }
  }, [isResizing, resizeDirection, position.x, position.y, position.width, position.height, onPositionChange]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    resizeStartRef.current = null;
  }, []);

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

  // Global mouse listeners for resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

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
                key={refreshKey}
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
                key={refreshKey}
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
                key={refreshKey}
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
                key={refreshKey}
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
              key={refreshKey}
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
            return <YnetMivzakimWidget key={refreshKey} />;
          }
          return renderError(`Unknown component: ${componentName}`);

        default:
          return renderError('No content configured');
      }
    } catch (err) {
      logger.error('Error rendering content', { error: err, component: 'WidgetContainer' });
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
        cursor: isResizing ? (resizeDirection?.includes('e') || resizeDirection?.includes('w') ? 'ew-resize' : resizeDirection?.includes('n') || resizeDirection?.includes('s') ? 'ns-resize' : 'default') : isDragging ? 'grabbing' : IS_TV_BUILD ? 'pointer' : 'default',
        // TV: Always show focus indicator
        outline: IS_TV_BUILD && isFocused ? '2px solid #00aaff' : 'none',
        outlineOffset: '2px',
        transition: !isResizing && !isDragging ? 'all 0.3s ease' : 'none',
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
              onPress={handleToggleMinimize}
            >
              {isMinimized ? (
                <Maximize2 size={14} color={colors.text} />
              ) : (
                <Minimize2 size={14} color={colors.text} />
              )}
            </Pressable>

            {/* Refresh Button */}
            <Pressable style={styles.controlButton} onPress={handleRefresh}>
              <RefreshCw size={14} color={colors.text} />
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
            <View style={styles.titleRow}>
              {widget.icon && <Text style={styles.icon}>{widget.icon}</Text>}
              <Text style={styles.title} numberOfLines={1}>{widget.title}</Text>
            </View>
            <Text style={styles.timestamp}>{formatTimestamp()}</Text>
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

        {/* Resize handles - only when not minimized and not on TV */}
        {!isMinimized && !IS_TV_BUILD && (
          <>
            {/* Edge handles */}
            <div
              style={styles.resizeHandleN as any}
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
            <div
              style={styles.resizeHandleS as any}
              onMouseDown={(e) => handleResizeStart(e, 's')}
            />
            <div
              style={styles.resizeHandleE as any}
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            <div
              style={styles.resizeHandleW as any}
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            {/* Corner handles */}
            <div
              style={styles.resizeHandleNE as any}
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              style={styles.resizeHandleNW as any}
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              style={styles.resizeHandleSE as any}
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
            <div
              style={styles.resizeHandleSW as any}
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
          </>
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
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 40,
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
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    flex: 1,
    maxWidth: '40%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  timestamp: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
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
  // Resize handle base styles
  resizeHandleN: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 6,
    cursor: 'n-resize',
  } as any,
  resizeHandleS: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 6,
    cursor: 's-resize',
  } as any,
  resizeHandleE: {
    position: 'absolute',
    top: 8,
    right: 0,
    bottom: 8,
    width: 6,
    cursor: 'e-resize',
  } as any,
  resizeHandleW: {
    position: 'absolute',
    top: 8,
    left: 0,
    bottom: 8,
    width: 6,
    cursor: 'w-resize',
  } as any,
  resizeHandleNE: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    cursor: 'ne-resize',
  } as any,
  resizeHandleNW: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    cursor: 'nw-resize',
  } as any,
  resizeHandleSE: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    cursor: 'se-resize',
  } as any,
  resizeHandleSW: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    cursor: 'sw-resize',
  } as any,
});
