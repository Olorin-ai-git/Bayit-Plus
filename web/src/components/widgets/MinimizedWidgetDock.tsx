import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useWidgetStore } from '@/stores/widgetStore';
import { glass, colors, spacing, borderRadius } from '@olorin/design-tokens';
import type { Widget } from '@/types/widget';

interface IconButtonProps {
  widget: Widget;
  isHovered: boolean;
  isHighlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function IconButton({ widget, isHovered, isHighlighted, onHover, onLeave, onClick }: IconButtonProps) {
  return (
    <Pressable
      onPress={onClick}
      onHoverIn={onHover}
      onHoverOut={onLeave}
      style={[
        styles.iconButton,
        isHovered && styles.iconButtonHovered,
        isHighlighted && styles.iconButtonHighlighted,
      ]}
      aria-label={`Restore ${widget.title}`}
      role="button"
      accessible={true}
    >
      <Text style={styles.iconEmoji}>{widget.icon || '📻'}</Text>
    </Pressable>
  );
}

interface PreviewPopupProps {
  widget: Widget;
  iconIndex: number;
  iconSize: number;
  iconSpacing: number;
  containerPadding: number;
}

function PreviewPopup({ widget, iconIndex, iconSize, iconSpacing, containerPadding }: PreviewPopupProps) {
  const popupWidth = 220;
  const popupHeight = 110;

  const iconCenterX = containerPadding + iconIndex * (iconSize + iconSpacing) + iconSize / 2;
  const popupLeft = Math.max(
    0,
    Math.min(
      iconCenterX - popupWidth / 2,
      typeof window !== 'undefined' ? window.innerWidth - popupWidth : iconCenterX - popupWidth / 2
    )
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: iconSize + 16,
        left: popupLeft,
        width: popupWidth,
        height: popupHeight,
        ...(styles.popup as any),
      }}
    >
      <View style={styles.popupContent}>
        <View style={styles.popupIcon}>
          <Text style={styles.popupIconEmoji}>{widget.icon || '📻'}</Text>
        </View>

        <View style={styles.popupInfo}>
          <Text style={styles.popupTitle} numberOfLines={1}>
            {widget.title}
          </Text>
          <Text style={styles.popupDescription} numberOfLines={2}>
            {widget.description || 'Click to restore'}
          </Text>
        </View>
      </View>

      <div style={styles.popupArrow as any} />
    </div>
  );
}

// Inject keyframes for pulse animation
if (typeof document !== 'undefined' && !document.getElementById('minimized-dock-animations')) {
  const style = document.createElement('style');
  style.id = 'minimized-dock-animations';
  style.textContent = `
    @keyframes pulse {
      0%, 100% {
        transform: scale(1.15);
        box-shadow: 0 0 24px rgba(139, 92, 246, 0.8), 0 0 48px rgba(139, 92, 246, 0.4);
      }
      50% {
        transform: scale(1.2);
        box-shadow: 0 0 32px rgba(139, 92, 246, 1), 0 0 64px rgba(139, 92, 246, 0.6);
      }
    }
  `;
  document.head.appendChild(style);
}

export default function MinimizedWidgetDock() {
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const [highlightedWidgetId, setHighlightedWidgetId] = useState<string | null>(null);
  const { widgets, getWidgetState, toggleMinimize } = useWidgetStore();
  const previousMinimizedIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);

  const minimizedWidgets = widgets.filter((widget) => {
    const state = getWidgetState(widget.id);
    return state?.isMinimized && state?.isVisible;
  });

  // Detect newly minimized widget and highlight it
  useEffect(() => {
    const currentMinimizedIds = new Set(minimizedWidgets.map(w => w.id));

    // Skip highlighting on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousMinimizedIdsRef.current = currentMinimizedIds;
      return;
    }

    // Find widget that was just minimized (exists in current but not in previous)
    const newlyMinimized = Array.from(currentMinimizedIds).find(
      id => !previousMinimizedIdsRef.current.has(id)
    );

    if (newlyMinimized) {
      setHighlightedWidgetId(newlyMinimized);
      const timer = setTimeout(() => {
        setHighlightedWidgetId(null);
      }, 2000); // Highlight for 2 seconds

      // Update the ref after setting highlight
      previousMinimizedIdsRef.current = currentMinimizedIds;
      return () => clearTimeout(timer);
    }

    // Update ref even if no new widget (e.g., widget was restored)
    previousMinimizedIdsRef.current = currentMinimizedIds;
  }, [minimizedWidgets]);

  if (minimizedWidgets.length === 0) return null;

  const iconSize = 56;
  const iconSpacing = 12;
  const containerPadding = 16;
  const containerWidth =
    containerPadding * 2 +
    minimizedWidgets.length * iconSize +
    (minimizedWidgets.length - 1) * iconSpacing;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: `calc(50% - ${containerWidth / 2}px)`,
        zIndex: 50,
        ...(styles.container as any),
        width: containerWidth,
      }}
      role="toolbar"
      aria-label="Minimized widgets"
    >
      <View style={styles.iconsRow}>
        {minimizedWidgets.map((widget) => (
          <IconButton
            key={widget.id}
            widget={widget}
            isHovered={hoveredWidgetId === widget.id}
            isHighlighted={highlightedWidgetId === widget.id}
            onHover={() => setHoveredWidgetId(widget.id)}
            onLeave={() => setHoveredWidgetId(null)}
            onClick={() => toggleMinimize(widget.id)}
          />
        ))}
      </View>

      {hoveredWidgetId && (() => {
        const hoveredWidget = minimizedWidgets.find((w) => w.id === hoveredWidgetId);
        const iconIndex = minimizedWidgets.findIndex((w) => w.id === hoveredWidgetId);

        if (!hoveredWidget || iconIndex === -1) return null;

        return (
          <PreviewPopup
            widget={hoveredWidget}
            iconIndex={iconIndex}
            iconSize={iconSize}
            iconSpacing={iconSpacing}
            containerPadding={containerPadding}
          />
        );
      })()}

      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}
      >
        {hoveredWidgetId && `Preview: ${minimizedWidgets.find((w) => w.id === hoveredWidgetId)?.title}`}
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: glass.bg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  } as any,

  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },

  iconButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web CSS
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  } as any,

  iconButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: glass.borderFocus,
    // @ts-ignore - Web CSS
    transform: [{ scale: 1.1 }],
    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
  } as any,

  iconButtonHighlighted: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: '#8b5cf6',
    borderWidth: 2,
    // @ts-ignore - Web CSS
    transform: [{ scale: 1.15 }],
    boxShadow: '0 0 24px rgba(139, 92, 246, 0.8), 0 0 48px rgba(139, 92, 246, 0.4)',
    animation: 'pulse 1s ease-in-out infinite',
  } as any,

  iconEmoji: {
    fontSize: 28,
  },

  popup: {
    backgroundColor: glass.bg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing[4],
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
  } as any,

  popupContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },

  popupIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  popupIconEmoji: {
    fontSize: 20,
  },

  popupInfo: {
    flex: 1,
    gap: spacing[1],
  },

  popupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  popupDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  popupArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: `6px solid ${glass.border}`,
  } as any,
});
