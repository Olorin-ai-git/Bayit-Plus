/**
 * GlassSplitterHandle Component
 *
 * Consistent collapsible splitter handle for resizable panels.
 * Used for resizable panels and sidebars throughout the app.
 * Features a glass button with arrow icon that toggles collapse state.
 */

import React from 'react';
import {
  View,
  Platform,
  Pressable,
  I18nManager,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export interface GlassSplitterHandleProps {
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Panel position */
  position: 'left' | 'right';
  /** Force RTL layout */
  isRTL?: boolean;
  /** Whether currently dragging */
  isDragging?: boolean;
  /** Drag start callback (web only) */
  onDragStart?: (e: React.MouseEvent) => void;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic splitter handle component
 */
export const GlassSplitterHandle: React.FC<GlassSplitterHandleProps> = ({
  isCollapsed,
  onToggle,
  position,
  isRTL: forceRTL,
  isDragging = false,
  onDragStart,
  style,
  testID,
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;

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
  const handlePosition =
    position === 'right'
      ? isRTL
        ? { right: -22 }
        : { left: -22 }
      : isRTL
        ? { left: -22 }
        : { right: -22 };

  if (Platform.OS !== 'web') {
    // Native: simple pressable
    return (
      <View
        className="absolute z-[9999]"
        style={[{ top: spacing.xl * 2 }, handlePosition, style]}
        testID={testID}
      >
        <Pressable
          onPress={onToggle}
          className="w-11 h-11 rounded-lg bg-transparent border-2 items-center justify-center opacity-60"
          style={{ borderColor: colors.primary }}
        >
          <View className="items-center justify-center">
            <Text className="text-base font-bold" style={{ color: colors.primary }}>
              {getArrowIcon()}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // Web: Enhanced with hover effects
  return (
    <div
      style={{
        position: 'absolute',
        top: spacing.xl * 2,
        zIndex: 9999,
        ...(position === 'right'
          ? isRTL
            ? { right: -22 }
            : { left: -22 }
          : isRTL
            ? { left: -22 }
            : { right: -22 }),
        ...(style as React.CSSProperties),
      }}
      data-testid={testID}
    >
      {/* Toggle Button - Glass style matching main sidebar */}
      <div
        onClick={onToggle}
        style={{
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: 'transparent',
          border: `2px solid ${colors.primary.DEFAULT}`,
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
          (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.primary.DEFAULT + '30';
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.opacity = '0.6';
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        }}
      >
        <span
          style={{
            color: colors.primary.DEFAULT,
            fontSize: 16,
            fontWeight: 'bold',
            lineHeight: 1,
          }}
        >
          {getArrowIcon()}
        </span>
      </div>

      {/* Drag Handle - Only show when expanded and draggable */}
      {!isCollapsed && onDragStart && (
        <div
          onMouseDown={onDragStart as unknown as React.MouseEventHandler}
          style={{
            position: 'absolute',
            top: 52,
            left: position === 'right' ? (isRTL ? 'auto' : 22) : isRTL ? 22 : 'auto',
            right: position === 'right' ? (isRTL ? 22 : 'auto') : isRTL ? 'auto' : 22,
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

export default GlassSplitterHandle;
