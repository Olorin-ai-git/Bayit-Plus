/**
 * SwipeableCard Component
 *
 * iOS-style swipeable card with action buttons
 * Features:
 * - Swipe right-to-left to reveal actions
 * - Favorite and delete actions
 * - Smooth animations
 * - Haptic feedback
 */

import React from 'react';
import { View, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GlassView, GlassButton } from '@bayit/shared';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { spacing, colors } from '../theme';

export interface SwipeableCardProps {
  /** Callback when delete action is triggered */
  onDelete?: () => void;

  /** Callback when favorite action is triggered */
  onFavorite?: () => void;

  /** Card content */
  children: React.ReactNode;

  /** Whether the item is already favorited */
  isFavorited?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  onDelete,
  onFavorite,
  children,
  isFavorited = false,
}) => {
  const handleAction = (action: () => void) => {
    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('impactMedium');
    }
    action();
  };

  const renderRightActions = () => (
    <View className="flex-row items-center">
      {onFavorite && (
        <GlassButton
          variant="secondary"
          onPress={() => handleAction(onFavorite)}
          className={`w-20 h-full justify-center items-center rounded-none ${isFavorited ? 'bg-[rgba(255,204,0,1)]' : 'bg-[rgba(255,204,0,0.8)]'}`}
        >
          {isFavorited ? '★' : '☆'}
        </GlassButton>
      )}
      {onDelete && (
        <GlassButton
          variant="danger"
          onPress={() => handleAction(onDelete)}
          className="w-20 h-full justify-center items-center rounded-none bg-[rgba(255,59,48,0.8)]"
        >
          🗑️
        </GlassButton>
      )}
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      friction={2}
      overshootRight={false}
    >
      <GlassView className="mb-4">
        {children}
      </GlassView>
    </Swipeable>
  );
};
