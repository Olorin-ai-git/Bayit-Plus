/**
 * GlassToast Component
 * Unified cross-platform toast notification with glassmorphic styling
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, I18nManager } from 'react-native';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useToastAnimation } from './animations';
import {
  announceToScreenReader,
  getLiveRegionPriority,
  getActionHint,
} from './accessibility';
import { baseStyles, tvStyles, LEVEL_COLORS } from './styles';
import { spacing } from '../../../theme';
import type { GlassToastProps } from './types';

export const GlassToast: React.FC<GlassToastProps> = ({
  notification,
  position = 'bottom',
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isTv] = useState(Platform.isTV);

  const { animatedStyle } = useToastAnimation(
    isVisible,
    () => onDismiss(notification.id),
    false
  );

  const levelColors = LEVEL_COLORS[notification.level];
  const styles = isTv ? tvStyles : baseStyles;

  useEffect(() => {
    // Announce to screen reader
    announceToScreenReader(
      notification.message,
      notification.title,
      notification.level
    );

    // Auto-dismiss timer
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleAction = () => {
    if (notification.action) {
      notification.action.onPress();
    }
    handleDismiss();
  };

  const renderGlassContainer = (children: React.ReactNode) => {
    if (Platform.OS === 'web') {
      return (
        <Animated.View
          style={[
            styles.container,
            baseStyles.webGlass,
            {
              backgroundColor: levelColors.bg,
              borderColor: levelColors.border,
            },
            animatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      );
    }

    return (
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={[
            levelColors.bg,
            'rgba(20, 20, 20, 0.85)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.container,
            { borderColor: levelColors.border },
          ]}
        >
          {children}
        </LinearGradient>
      </Animated.View>
    );
  };

  const isRTL = I18nManager.isRTL;

  return renderGlassContainer(
    <>
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: levelColors.bg },
          isRTL && { marginRight: 0, marginLeft: spacing.sm },
        ]}
      >
        <Text style={{ fontSize: 20 }}>{levelColors.emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {notification.title && (
          <Text
            style={[styles.title, { color: levelColors.text }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
        )}
        <Text
          style={[styles.message, { color: levelColors.text }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>

        {notification.action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
            accessible
            accessibilityRole="button"
            accessibilityLabel={notification.action.label}
            accessibilityHint={getActionHint(notification.action.label)}
          >
            <Text style={styles.actionText}>
              {notification.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss button */}
      {notification.dismissable && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default GlassToast;
