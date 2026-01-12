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
import { View, Modal, StyleSheet, Pressable, ViewStyle } from 'react-native';
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
        style={styles.backdrop}
        onPress={dismissable ? onClose : undefined}
        accessible={false}
      >
        <View />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        entering={SlideInDown.duration(300).springify()}
        exiting={SlideOutDown.duration(250)}
        style={[
          styles.sheet,
          height === 'auto' ? {} : { height },
          style,
        ]}
      >
        <GlassView intensity="high" style={styles.content}>
          {/* Drag handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Content */}
          {children}
        </GlassView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  handleContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.sm,
  },
});
