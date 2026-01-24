/**
 * GlassSectionItem - A section item for home page configuration
 * Displays section info with drag handle and up/down arrow buttons
 * Supports glassmorphism styling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './GlassView';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

interface GlassSectionItemProps {
  /** Section icon (emoji) */
  icon: string;
  /** i18n key for the section label */
  labelKey: string;
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
}

export const GlassSectionItem: React.FC<GlassSectionItemProps> = ({
  icon,
  labelKey,
  visible,
  isFirst = false,
  isLast = false,
  isDragging = false,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  showDragHandle = Platform.OS === 'web',
  showArrows = true,
}) => {
  const { t } = useTranslation();
  const { isRTL, flexDirection } = useDirection();
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = [
    isTV ? styles.containerTV : styles.container,
    isDragging ? styles.containerDragging : isFocused ? styles.containerFocused : styles.containerNormal
  ];

  const buttonSize = isTV ? styles.buttonTV : styles.button;
  const buttonRadius = isTV ? styles.buttonRadiusTV : styles.buttonRadius;

  return (
    <GlassView style={containerStyle}>
      <View style={[styles.mainRow, { flexDirection }]}>
        {/* Drag Handle (web only) */}
        {showDragHandle && (
          <View style={styles.dragHandle} data-drag-handle="true">
            <Text style={[
              isTV ? styles.dragHandleTextTV : styles.dragHandleText,
              { color: 'rgba(255, 255, 255, 0.6)', letterSpacing: -2 }
            ]}>
              ⋮⋮
            </Text>
          </View>
        )}

        {/* Section Info */}
        <View style={[styles.sectionInfo, { flexDirection }]}>
          <Text style={isTV ? styles.iconTV : styles.icon}>{icon}</Text>
          <Text style={[
            isTV ? styles.labelTV : styles.label,
            { color: colors.text },
            isRTL && styles.labelRTL
          ]}>
            {t(labelKey)}
          </Text>
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
                style={[buttonSize, buttonRadius, styles.controlButton, isFirst && styles.controlButtonDisabled]}
                accessibilityLabel={t('common.moveUp', 'Move up')}
                accessibilityRole="button"
              >
                <Text style={[
                  isTV ? styles.arrowTextTV : styles.arrowText,
                  { color: isFirst ? 'rgba(255, 255, 255, 0.6)' : colors.text }
                ]}>
                  ▲
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMoveDown}
                disabled={isLast}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[buttonSize, buttonRadius, styles.controlButton, isLast && styles.controlButtonDisabled]}
                accessibilityLabel={t('common.moveDown', 'Move down')}
                accessibilityRole="button"
              >
                <Text style={[
                  isTV ? styles.arrowTextTV : styles.arrowText,
                  { color: isLast ? 'rgba(255, 255, 255, 0.6)' : colors.text }
                ]}>
                  ▼
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Visibility Toggle */}
          {onToggleVisibility && (
            <TouchableOpacity
              onPress={onToggleVisibility}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={[buttonSize, buttonRadius, styles.controlButton]}
              accessibilityLabel={
                visible
                  ? t('settings.tapToHide', 'Tap to hide')
                  : t('settings.tapToShow', 'Tap to show')
              }
              accessibilityRole="button"
            >
              <Text style={isTV ? styles.visibilityIconTV : styles.visibilityIcon}>
                {visible ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassView>
  );
};


// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  // Container styles
  container: {
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  containerTV: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  containerNormal: {
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
  },
  containerDragging: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
  },

  // Main row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Drag handle
  dragHandle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    // @ts-ignore - Web CSS
    cursor: 'grab',
  },
  dragHandleText: {
    fontSize: 16,
  },
  dragHandleTextTV: {
    fontSize: 20,
  },

  // Section info
  sectionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 22,
  },
  iconTV: {
    fontSize: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  labelTV: {
    fontSize: 18,
    fontWeight: '500',
  },
  labelRTL: {
    textAlign: 'right',
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Buttons
  button: {
    width: 36,
    height: 36,
  },
  buttonTV: {
    width: 44,
    height: 44,
  },
  buttonRadius: {
    borderRadius: 18,
  },
  buttonRadiusTV: {
    borderRadius: 22,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },

  // Text in buttons
  arrowText: {
    fontSize: 12,
  },
  arrowTextTV: {
    fontSize: 16,
  },
  visibilityIcon: {
    fontSize: 16,
  },
  visibilityIconTV: {
    fontSize: 20,
  },
});

export default GlassSectionItem;
