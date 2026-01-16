/**
 * GlassResizablePanel - A resizable panel with a draggable splitter
 * Uses glassmorphism styling
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Pressable, I18nManager } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { GlassView } from './GlassView';

interface GlassResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  style?: any;
  onWidthChange?: (width: number) => void;
}

export const GlassResizablePanel: React.FC<GlassResizablePanelProps> = ({
  children,
  defaultWidth = 380,
  minWidth = 280,
  maxWidth = 600,
  position = 'right',
  style,
  onWidthChange,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<View>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);
  const isRTL = I18nManager.isRTL || (Platform.OS === 'web' && typeof document !== 'undefined' && document.dir === 'rtl');

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
      <View style={[styles.panel, { width }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View 
      ref={panelRef}
      style={[
        styles.panel, 
        { width, flexDirection: splitterPosition === 'left' ? 'row' : 'row-reverse' },
        style,
      ]}
    >
      {/* Splitter Handle */}
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
            backgroundColor: isDragging ? colors.primary : colors.glassBorder,
            transition: isDragging ? 'none' : 'background-color 0.2s ease',
            opacity: isDragging ? 1 : 0.5,
          }}
        />
      </div>
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
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
