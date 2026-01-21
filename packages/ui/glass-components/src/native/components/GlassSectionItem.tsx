/**
 * GlassSectionItem Component
 *
 * A section item for home page configuration.
 * Displays section info with drag handle and up/down arrow buttons.
 * Supports glassmorphism styling.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

export interface GlassSectionItemProps {
  /** Section icon (emoji) */
  icon: string;
  /** Section label text or translation key */
  label: string;
  /** Whether section is visible */
  visible: boolean;
  /** Whether this is the first item (disable up button) */
  isFirst?: boolean;
  /** Whether this is the last item (disable down button) */
  isLast?: boolean;
  /** Whether the item is currently being dragged */
  isDragging?: boolean;
  /** Callback to move section up */
  onMoveUp?: () => void;
  /** Callback to move section down */
  onMoveDown?: () => void;
  /** Callback to toggle visibility */
  onToggleVisibility?: () => void;
  /** Show drag handle (web only) */
  showDragHandle?: boolean;
  /** Show arrow buttons */
  showArrows?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Move up accessibility label */
  moveUpLabel?: string;
  /** Move down accessibility label */
  moveDownLabel?: string;
  /** Toggle visibility accessibility label */
  toggleVisibilityLabel?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic section item component
 */
export const GlassSectionItem: React.FC<GlassSectionItemProps> = ({
  icon,
  label,
  visible,
  isFirst = false,
  isLast = false,
  isDragging = false,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  showDragHandle = Platform.OS === 'web',
  showArrows = true,
  isRTL: forceRTL,
  moveUpLabel = 'Move up',
  moveDownLabel = 'Move down',
  toggleVisibilityLabel,
  style,
  testID,
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const [isFocused, setIsFocused] = useState(false);

  const visibilityLabel =
    toggleVisibilityLabel || (visible ? 'Tap to hide' : 'Tap to show');

  return (
    <GlassView
      style={[
        styles.container,
        isDragging && styles.dragging,
        isFocused && styles.focused,
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.content, { flexDirection }]}>
        {/* Drag Handle (web only) */}
        {showDragHandle && (
          <View style={styles.dragHandle} data-drag-handle="true">
            <Text style={styles.dragHandleText}>⋮⋮</Text>
          </View>
        )}

        {/* Section Info */}
        <View style={[styles.sectionInfo, { flexDirection }]}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.label, isRTL && styles.labelRTL]}>{label}</Text>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { flexDirection }]}>
          {/* Arrow Buttons (for TV and accessibility) */}
          {showArrows && visible && (
            <>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={isFirst}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[styles.arrowButton, isFirst && styles.arrowButtonDisabled]}
                accessibilityLabel={moveUpLabel}
                accessibilityRole="button"
              >
                <Text style={[styles.arrowText, isFirst && styles.arrowTextDisabled]}>▲</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMoveDown}
                disabled={isLast}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[styles.arrowButton, isLast && styles.arrowButtonDisabled]}
                accessibilityLabel={moveDownLabel}
                accessibilityRole="button"
              >
                <Text style={[styles.arrowText, isLast && styles.arrowTextDisabled]}>▼</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Visibility Toggle */}
          {onToggleVisibility && (
            <TouchableOpacity
              onPress={onToggleVisibility}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={styles.visibilityButton}
              accessibilityLabel={visibilityLabel}
              accessibilityRole="button"
            >
              <Text style={styles.visibilityText}>{visible ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: isTV ? spacing.md : spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dragging: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dragHandle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dragHandleText: {
    fontSize: isTV ? 20 : 16,
    color: colors.textMuted,
    letterSpacing: -2,
  },
  sectionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: isTV ? 28 : 22,
  },
  label: {
    fontSize: isTV ? 18 : 16,
    color: colors.text,
    fontWeight: '500',
  },
  labelRTL: {
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arrowButton: {
    width: isTV ? 44 : 36,
    height: isTV ? 44 : 36,
    borderRadius: isTV ? 22 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: isTV ? 16 : 12,
    color: colors.text,
  },
  arrowTextDisabled: {
    color: colors.textMuted,
  },
  visibilityButton: {
    width: isTV ? 44 : 36,
    height: isTV ? 44 : 36,
    borderRadius: isTV ? 22 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  visibilityText: {
    fontSize: isTV ? 20 : 16,
  },
});

export default GlassSectionItem;
