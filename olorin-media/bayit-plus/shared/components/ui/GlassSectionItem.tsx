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

  return (
    <GlassView
      className={`${isTV ? 'p-4' : 'p-2'} rounded-lg border-2 ${
        isDragging ? 'border-purple-500 bg-purple-500/20' : isFocused ? 'border-purple-500 bg-purple-500/15' : 'border-transparent'
      }`}
    >
      <View className="flex-row items-center gap-4" style={{ flexDirection }}>
        {/* Drag Handle (web only) */}
        {showDragHandle && (
          <View
            className="px-1 py-2 cursor-grab"
            data-drag-handle="true"
          >
            <Text className={`${isTV ? 'text-[20px]' : 'text-base'} text-white/60`} style={{ letterSpacing: -2 }}>⋮⋮</Text>
          </View>
        )}

        {/* Section Info */}
        <View className="flex-1 flex-row items-center gap-2" style={{ flexDirection }}>
          <Text className={isTV ? 'text-[28px]' : 'text-[22px]'}>{icon}</Text>
          <Text className={`${isTV ? 'text-lg' : 'text-base'} text-white font-medium ${isRTL ? 'text-right' : ''}`}>
            {t(labelKey)}
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center gap-2" style={{ flexDirection }}>
          {/* Arrow Buttons (for TV and accessibility) */}
          {showArrows && visible && (
            <>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={isFirst}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`${isTV ? 'w-11 h-11' : 'w-9 h-9'} ${isTV ? 'rounded-[22px]' : 'rounded-[18px]'} bg-white/10 justify-center items-center border border-white/20 ${
                  isFirst ? 'opacity-30' : ''
                }`}
                accessibilityLabel={t('common.moveUp', 'Move up')}
                accessibilityRole="button"
              >
                <Text
                  className={`${isTV ? 'text-base' : 'text-xs'} ${isFirst ? 'text-white/60' : 'text-white'}`}
                >
                  ▲
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMoveDown}
                disabled={isLast}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`${isTV ? 'w-11 h-11' : 'w-9 h-9'} ${isTV ? 'rounded-[22px]' : 'rounded-[18px]'} bg-white/10 justify-center items-center border border-white/20 ${
                  isLast ? 'opacity-30' : ''
                }`}
                accessibilityLabel={t('common.moveDown', 'Move down')}
                accessibilityRole="button"
              >
                <Text
                  className={`${isTV ? 'text-base' : 'text-xs'} ${isLast ? 'text-white/60' : 'text-white'}`}
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
              className={`${isTV ? 'w-11 h-11' : 'w-9 h-9'} ${isTV ? 'rounded-[22px]' : 'rounded-[18px]'} bg-white/10 justify-center items-center border border-white/20`}
              accessibilityLabel={
                visible
                  ? t('settings.tapToHide', 'Tap to hide')
                  : t('settings.tapToShow', 'Tap to show')
              }
              accessibilityRole="button"
            >
              <Text className={isTV ? 'text-xl' : 'text-base'}>
                {visible ? '👁️' : '👁️‍🗨️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassView>
  );
};


export default GlassSectionItem;
