/**
 * GlassSplitterHandle - Consistent collapsible splitter handle
 * Used for resizable panels and sidebars throughout the app
 * Features a glass button with arrow icon that toggles collapse state
 */

import React from 'react';
import { View, Platform, Pressable, I18nManager, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface GlassSplitterHandleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  position: 'left' | 'right';
  isRTL?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  style?: any;
}

export const GlassSplitterHandle: React.FC<GlassSplitterHandleProps> = ({
  isCollapsed,
  onToggle,
  position,
  isRTL = false,
  isDragging = false,
  onDragStart,
  style,
}) => {
  // Determine arrow direction based on collapse state, position, and RTL
  const getArrowIcon = () => {
    if (position === 'right') {
      // Right panel: collapsed = point left (expand), expanded = point right (collapse)
      if (isCollapsed) {
        return isRTL ? '▶' : '◀';
      } else {
        return isRTL ? '◀' : '▶';
      }
    } else {
      // Left panel: collapsed = point right (expand), expanded = point left (collapse)
      if (isCollapsed) {
        return isRTL ? '◀' : '▶';
      } else {
        return isRTL ? '▶' : '◀';
      }
    }
  };

  // Position the handle on the appropriate edge
  const handlePosition = position === 'right'
    ? (isRTL ? { right: -22 } : { left: -22 })
    : (isRTL ? { left: -22 } : { right: -22 });

  if (Platform.OS !== 'web') {
    // Native: simple pressable
    return (
      <View style={[styles.nativeContainer, { top: spacing.xl * 2 }, handlePosition, style]}>
        <Pressable
          onPress={onToggle}
          style={[styles.nativeButton, { borderColor: colors.primary }]}
        >
          <View style={styles.nativeIconContainer}>
            <View style={[styles.nativeIcon, { color: colors.primary }]}>
              {/* Use a simple arrow character */}
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: spacing.xl * 2,
        zIndex: 9999,
        ...(position === 'right'
          ? (isRTL ? { right: -22 } : { left: -22 })
          : (isRTL ? { left: -22 } : { right: -22 })
        ),
        ...style,
      }}
    >
      {/* Toggle Button - Glass style matching main sidebar */}
      <div
        onClick={onToggle}
        style={{
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: 'transparent',
          border: `2px solid ${colors.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: 0.6,
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.opacity = '1';
          (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.primary + '30';
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.opacity = '0.6';
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        }}
      >
        <span style={{
          color: colors.primary,
          fontSize: 16,
          fontWeight: 'bold',
          lineHeight: 1,
        }}>
          {getArrowIcon()}
        </span>
      </div>

      {/* Drag Handle - Only show when expanded and draggable */}
      {!isCollapsed && onDragStart && (
        <div
          onMouseDown={onDragStart as any}
          style={{
            position: 'absolute',
            top: 52,
            left: position === 'right' ? (isRTL ? 'auto' : 22) : (isRTL ? 22 : 'auto'),
            right: position === 'right' ? (isRTL ? 22 : 'auto') : (isRTL ? 'auto' : 22),
            width: 6,
            height: 48,
            borderRadius: 3,
            backgroundColor: isDragging ? colors.primary : colors.glassBorder,
            cursor: isDragging ? 'grabbing' : 'col-resize',
            opacity: isDragging ? 1 : 0.4,
            transition: isDragging ? 'none' : 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.primary + '80';
              (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.glassBorder;
              (e.currentTarget as HTMLDivElement).style.opacity = '0.4';
            }
          }}
        />
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  // Native styles
  nativeContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  nativeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  nativeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GlassSplitterHandle;
