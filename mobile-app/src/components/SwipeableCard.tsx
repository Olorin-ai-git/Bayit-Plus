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
import { View, StyleSheet, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GlassView, GlassButton } from '@bayit/shared';
import * as Haptics from 'expo-haptics';
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    action();
  };

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      {onFavorite && (
        <GlassButton
          variant="secondary"
          onPress={() => handleAction(onFavorite)}
          style={[
            styles.action,
            styles.favoriteAction,
            isFavorited && styles.favoritedAction,
          ]}
        >
          {isFavorited ? '★' : '☆'}
        </GlassButton>
      )}
      {onDelete && (
        <GlassButton
          variant="danger"
          onPress={() => handleAction(onDelete)}
          style={[styles.action, styles.deleteAction]}
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
      <GlassView style={styles.card}>
        {children}
      </GlassView>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  favoriteAction: {
    backgroundColor: 'rgba(255, 204, 0, 0.8)',
  },
  favoritedAction: {
    backgroundColor: 'rgba(255, 204, 0, 1)',
  },
  deleteAction: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
  },
});
