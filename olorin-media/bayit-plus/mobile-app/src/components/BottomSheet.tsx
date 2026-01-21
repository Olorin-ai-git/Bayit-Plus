/**
 * BottomSheet Component
 *
 * iOS-style bottom sheet modal for settings, filters, and actions
 * Features:
 * - Slide-in animation from bottom
 * - Backdrop with dismiss on tap
 * - Drag handle for visual affordance
 * - Auto or fixed height
 * - Glassmorphic styling
 */

import React from 'react';
import { View, Modal, Pressable, ViewStyle } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { GlassView } from '@bayit/shared';
import { spacing, borderRadius } from '../theme';

export interface BottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;

  /** Callback when bottom sheet should close */
  onClose: () => void;

  /** Content to display in bottom sheet */
  children: React.ReactNode;

  /** Height of bottom sheet - 'auto' or specific number */
  height?: number | 'auto';

  /** Custom container style */
  style?: ViewStyle;

  /** Whether to show the drag handle */
  showHandle?: boolean;

  /** Whether backdrop is dismissable (tap to close) */
  dismissable?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = 'auto',
  style,
  showHandle = true,
  dismissable = true,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/50"
        onPress={dismissable ? onClose : undefined}
        accessible={false}
      >
        <View />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        entering={SlideInDown.duration(300).springify()}
        exiting={SlideOutDown.duration(250)}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden"
        style={[height === 'auto' ? {} : { height }, style]}
      >
        <GlassView intensity="high" className="px-4 pb-4">
          {/* Drag handle */}
          {showHandle && (
            <View className="pt-4 pb-2 items-center">
              <View className="w-10 h-1 bg-white/30 rounded-sm" />
            </View>
          )}

          {/* Content */}
          {children}
        </GlassView>
      </Animated.View>
    </Modal>
  );
};
