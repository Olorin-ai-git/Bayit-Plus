/**
 * GlassResizablePanel Component
 *
 * A resizable panel with a draggable splitter.
 * Uses glassmorphism styling.
 * Features a collapsible handle for hiding/showing the panel.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassSplitterHandle } from './GlassSplitterHandle';

export interface GlassResizablePanelProps {
  /** Panel content */
  children: React.ReactNode;
  /** Default panel width */
  defaultWidth?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Width when collapsed */
  collapsedWidth?: number;
  /** Panel position */
  position?: 'left' | 'right';
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Width change callback */
  onWidthChange?: (width: number) => void;
  /** Enable collapse functionality */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Collapse state change callback */
  onCollapseChange?: (isCollapsed: boolean) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic resizable panel component
 */
export const GlassResizablePanel: React.FC<GlassResizablePanelProps> = ({
  children,
  defaultWidth = 380,
  minWidth = 280,
  maxWidth = 600,
  collapsedWidth = 0,
  position = 'right',
  style,
  onWidthChange,
  collapsible = true,
  defaultCollapsed = false,
  onCollapseChange,
  testID,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<View>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);
  const previousWidthRef = useRef(defaultWidth);
  const isRTL =
    I18nManager.isRTL ||
    (Platform.OS === 'web' && typeof document !== 'undefined' && document.dir === 'rtl');

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setWidth(previousWidthRef.current);
      onCollapseChange?.(false);
    } else {
      previousWidthRef.current = width;
      setIsCollapsed(true);
      onCollapseChange?.(true);
    }
  }, [isCollapsed, width, onCollapseChange]);

  const effectiveWidth = isCollapsed ? collapsedWidth : width;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startXRef.current;
      let newWidth: number;

      // Adjust direction based on panel position and RTL
      if (position === 'right') {
        newWidth = isRTL ? startWidthRef.current + deltaX : startWidthRef.current - deltaX;
      } else {
        newWidth = isRTL ? startWidthRef.current - deltaX : startWidthRef.current + deltaX;
      }

      // Clamp to min/max
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth, position, isRTL, onWidthChange]);

  const splitterPosition =
    position === 'right' ? (isRTL ? 'right' : 'left') : isRTL ? 'left' : 'right';

  if (Platform.OS !== 'web') {
    // On native, just render without resizing capability
    return (
      <View style={[styles.panel, { width: effectiveWidth }, style]} testID={testID}>
        {!isCollapsed && children}
        {collapsible && (
          <GlassSplitterHandle
            isCollapsed={isCollapsed}
            onToggle={toggleCollapse}
            position={position}
            isRTL={isRTL}
          />
        )}
      </View>
    );
  }

  return (
    <View
      ref={panelRef}
      style={[
        styles.panel,
        {
          width: effectiveWidth,
          flexDirection: splitterPosition === 'left' ? 'row' : 'row-reverse',
        },
        style,
      ]}
      testID={testID}
    >
      {/* Consistent Glass Splitter Handle */}
      {collapsible && (
        <GlassSplitterHandle
          isCollapsed={isCollapsed}
          onToggle={toggleCollapse}
          position={position}
          isRTL={isRTL}
          isDragging={isDragging}
          onDragStart={handleMouseDown}
        />
      )}

      {/* Drag area along the edge (when not using the handle) */}
      {!isCollapsed && !collapsible && (
        <div
          onMouseDown={handleMouseDown as unknown as React.MouseEventHandler}
          style={{
            position: 'absolute',
            [splitterPosition]: 0,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'col-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 4,
              height: 48,
              borderRadius: 2,
              backgroundColor: isDragging ? colors.primary : colors.glassBorder,
              transition: isDragging ? 'none' : 'background-color 0.2s ease',
              opacity: isDragging ? 1 : 0.5,
            }}
          />
        </div>
      )}

      {/* Content */}
      {!isCollapsed && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default GlassResizablePanel;
