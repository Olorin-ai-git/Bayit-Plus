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
  TouchableOpacity,
  Platform,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing } from '../../theme';

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

  const buttonSize = isTV ? 'w-11 h-11' : 'w-9 h-9';
  const buttonRadius = isTV ? 'rounded-[22px]' : 'rounded-[18px]';
  const arrowTextSize = isTV ? 'text-base' : 'text-xs';
  const visibilityTextSize = isTV ? 'text-xl' : 'text-base';

  return (
    <GlassView
      className={`rounded-lg border-2 ${
        isDragging
          ? 'border-primary bg-[rgba(168,85,247,0.2)]'
          : isFocused
            ? 'border-primary bg-[rgba(168,85,247,0.15)]'
            : 'border-transparent'
      }`}
      style={[{ padding: isTV ? spacing.md : spacing.sm }, style]}
      testID={testID}
    >
      <View className="flex-row items-center" style={{ flexDirection, gap: spacing.md }}>
        {/* Drag Handle (web only) */}
        {showDragHandle && (
          <View
            className="tracking-tighter"
            style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.sm }}
            data-drag-handle="true"
          >
            <Text
              style={{
                fontSize: isTV ? 20 : 16,
                color: colors.textMuted,
                letterSpacing: -2,
              }}
            >
              ⋮⋮
            </Text>
          </View>
        )}

        {/* Section Info */}
        <View className="flex-1 flex-row items-center" style={{ flexDirection, gap: spacing.sm }}>
          <Text style={{ fontSize: isTV ? 28 : 22 }}>{icon}</Text>
          <Text
            className={`font-medium ${isRTL ? 'text-right' : ''}`}
            style={{ fontSize: isTV ? 18 : 16, color: colors.text }}
          >
            {label}
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center" style={{ flexDirection, gap: spacing.sm }}>
          {/* Arrow Buttons (for TV and accessibility) */}
          {showArrows && visible && (
            <>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={isFirst}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`${buttonSize} ${buttonRadius} bg-white/10 justify-center items-center border border-white/20 ${
                  isFirst ? 'opacity-30' : ''
                }`}
                accessibilityLabel={moveUpLabel}
                accessibilityRole="button"
              >
                <Text
                  className={arrowTextSize}
                  style={{ color: isFirst ? colors.textMuted : colors.text }}
                >
                  ▲
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMoveDown}
                disabled={isLast}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`${buttonSize} ${buttonRadius} bg-white/10 justify-center items-center border border-white/20 ${
                  isLast ? 'opacity-30' : ''
                }`}
                accessibilityLabel={moveDownLabel}
                accessibilityRole="button"
              >
                <Text
                  className={arrowTextSize}
                  style={{ color: isLast ? colors.textMuted : colors.text }}
                >
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
              className={`${buttonSize} ${buttonRadius} bg-white/10 justify-center items-center border border-white/20`}
              accessibilityLabel={visibilityLabel}
              accessibilityRole="button"
            >
              <Text className={visibilityTextSize}>{visible ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassView>
  );
};

export default GlassSectionItem;
