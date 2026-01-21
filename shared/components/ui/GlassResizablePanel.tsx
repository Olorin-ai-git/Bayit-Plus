/**
 * GlassResizablePanel - A resizable panel with a draggable splitter
 * Uses glassmorphism styling
 * Features a collapsible handle for hiding/showing the panel
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Platform, Pressable, I18nManager } from 'react-native';
import { GlassSplitterHandle } from './GlassSplitterHandle';

interface GlassResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsedWidth?: number;
  position?: 'left' | 'right';
  style?: any;
  onWidthChange?: (width: number) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

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
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<View>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);
  const previousWidthRef = useRef(defaultWidth);
  const isRTL = I18nManager.isRTL || (Platform.OS === 'web' && typeof document !== 'undefined' && document.dir === 'rtl');

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

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

  const splitterPosition = position === 'right' 
    ? (isRTL ? 'right' : 'left') 
    : (isRTL ? 'left' : 'right');

  if (Platform.OS !== 'web') {
    // On native, just render without resizing capability
    return (
      <View className="relative flex-shrink-0" style={[{ width: effectiveWidth }, style]}>
        {!isCollapsed && children}
      </View>
    );
  }

  return (
    <View
      ref={panelRef}
      className="relative flex-shrink-0"
      style={[
        { width: effectiveWidth, flexDirection: splitterPosition === 'left' ? 'row' : 'row-reverse' },
        style,
      ]}
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
          onMouseDown={handleMouseDown as any}
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
              backgroundColor: isDragging ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
              transition: isDragging ? 'none' : 'background-color 0.2s ease',
              opacity: isDragging ? 1 : 0.5,
            }}
          />
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <View className="flex-1 overflow-hidden">
          {children}
        </View>
      )}
    </View>
  );
};

export default GlassResizablePanel;
