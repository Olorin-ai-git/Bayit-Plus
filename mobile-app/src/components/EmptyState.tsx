/**
 * EmptyState Component
 *
 * Displays empty state UI when no content is available
 * Features:
 * - Lucide icons support
 * - Accessibility labels and hints
 * - Scaled font sizes for accessibility
 * - Optional action button
 * - RTL support
 * - TouchableOpacity-safe button
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AccessibilityRole,
} from 'react-native';
import { useDirection } from '@bayit/shared-hooks';
import { useAccessibility } from '../hooks/useAccessibility';
import { useScaledFontSize } from '../hooks/useScaledFontSize';
import { GlassView, GlassButton } from '@bayit/shared';
import { colors, spacing } from '@olorin/design-tokens';

interface EmptyStateProps {
  /**
   * Icon component from lucide-react-native (e.g., Clock, Heart, Download)
   * Will render as large icon
   */
  icon?: React.ReactNode;

  /**
   * Icon emoji string as fallback (e.g., "⭐", "❤️")
   */
  iconEmoji?: string;

  /**
   * Title text
   */
  title: string;

  /**
   * Optional description text
   */
  description?: string;

  /**
   * Optional action button text (e.g., "Browse Content")
   */
  actionLabel?: string;

  /**
   * Callback when action button is pressed
   */
  onAction?: () => void;

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;

  /**
   * Accessibility hint for screen readers
   */
  accessibilityHint?: string;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Custom container style
   */
  containerStyle?: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  contentCard: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing[4],
  },
  iconEmoji: {
    fontSize: 60,
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: spacing[4],
    width: '100%',
  },
  button: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
});

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconEmoji,
  title,
  description,
  actionLabel,
  onAction,
  accessibilityLabel,
  accessibilityHint,
  testID = 'empty-state',
  containerStyle,
}) => {
  const { isRTL, direction } = useDirection();
  const { scaledFontSize } = useAccessibility();

  // Calculate scaled font sizes
  const scaledTitleSize = scaledFontSize.large;
  const scaledDescriptionSize = scaledFontSize.base;

  const containerStyles = [
    styles.container,
    containerStyle,
    {
      direction: isRTL ? 'rtl' : 'ltr',
    },
  ];

  const titleStyles = [
    styles.title,
    {
      fontSize: scaledTitleSize,
      textAlign: isRTL ? 'right' : 'left',
    },
  ];

  const descriptionStyles = [
    styles.description,
    {
      fontSize: scaledDescriptionSize,
      textAlign: isRTL ? 'right' : 'left',
    },
  ];

  return (
    <View
      style={containerStyles}
      testID={testID}
      accessible={true}
      accessibilityRole="status"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
    >
      <GlassView
        className="p-8 items-center w-full"
        style={styles.contentCard}
      >
        {/* Icon */}
        {(icon || iconEmoji) && (
          <View style={styles.iconContainer} accessible={false}>
            {icon ? (
              <View accessible={false}>
                {icon}
              </View>
            ) : iconEmoji ? (
              <Text style={styles.iconEmoji} accessible={false}>
                {iconEmoji}
              </Text>
            ) : null}
          </View>
        )}

        {/* Title */}
        <Text
          style={titleStyles}
          numberOfLines={2}
          accessible={false}
          allowFontScaling={true}
        >
          {title}
        </Text>

        {/* Description */}
        {description && (
          <Text
            style={descriptionStyles}
            numberOfLines={3}
            accessible={false}
            allowFontScaling={true}
          >
            {description}
          </Text>
        )}

        {/* Action Button */}
        {actionLabel && onAction && (
          <View style={styles.buttonContainer}>
            <GlassButton
              variant="primary"
              onPress={onAction}
              style={styles.button}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              testID={`${testID}-action-button`}
            >
              <Text
                style={{
                  color: colors.white,
                  fontWeight: '600',
                  fontSize: scaledDescriptionSize,
                }}
                allowFontScaling={true}
              >
                {actionLabel}
              </Text>
            </GlassButton>
          </View>
        )}
      </GlassView>
    </View>
  );
};

export default EmptyState;
