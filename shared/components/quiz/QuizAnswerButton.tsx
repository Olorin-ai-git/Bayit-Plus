/**
 * QuizAnswerButton - Child-friendly answer button for quiz questions
 * Features:
 * - Extended touch targets for different age groups
 * - Age-adaptive font sizes
 * - Color-coded answers (Coral, Teal, Yellow, Mint)
 * - Haptic feedback on selection
 * - tvOS focus navigation support
 * - Full accessibility support
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  Text,
  Platform,
  StyleSheet,
  AccessibilityInfo,
  Vibration,
} from 'react-native';
import { colors, borderRadius, spacing, quizAnswerColors } from '@olorin/design-tokens';
import { useTVFocus } from '../../hooks/useTVFocus';

type AgeGroup = 'toddlers' | 'preschool' | 'elementary' | 'preteen';
type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect';

interface QuizAnswerButtonProps {
  text: string;
  index: number;
  onPress: () => void;
  state?: AnswerState;
  ageGroup?: AgeGroup;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
  isRTL?: boolean;
}

// Age-adaptive sizing configuration
const AGE_CONFIG: Record<AgeGroup, {
  fontSize: number;
  tvFontSize: number;
  touchTarget: number;
  tvTouchTarget: number;
}> = {
  toddlers: { fontSize: 32, tvFontSize: 56, touchTarget: 80, tvTouchTarget: 120 },
  preschool: { fontSize: 28, tvFontSize: 48, touchTarget: 72, tvTouchTarget: 110 },
  elementary: { fontSize: 24, tvFontSize: 40, touchTarget: 56, tvTouchTarget: 100 },
  preteen: { fontSize: 20, tvFontSize: 36, touchTarget: 48, tvTouchTarget: 90 },
};

export const QuizAnswerButton: React.FC<QuizAnswerButtonProps> = ({
  text,
  index,
  onPress,
  state = 'default',
  ageGroup = 'elementary',
  disabled = false,
  hasTVPreferredFocus = false,
  isRTL = false,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform } = useTVFocus({
    styleType: 'button',
  });

  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const config = AGE_CONFIG[ageGroup];
  const colorSet = quizAnswerColors[index % quizAnswerColors.length];

  const handlePressWithHaptic = useCallback(() => {
    // Haptic feedback for mobile platforms
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Vibration.vibrate(10);
    }
    onPress();
  }, [onPress]);

  const getStateStyles = () => {
    switch (state) {
      case 'correct':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.4)',
          borderColor: colors.success.DEFAULT,
        };
      case 'incorrect':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.4)',
          borderColor: colors.error.DEFAULT,
        };
      case 'selected':
        return {
          backgroundColor: colorSet.bg,
          borderColor: colors.primary.DEFAULT,
          borderWidth: 3,
        };
      default:
        return {
          backgroundColor: colorSet.bg,
          borderColor: colorSet.border,
        };
    }
  };

  const stateStyles = getStateStyles();

  // Accessibility hint based on state
  const getAccessibilityHint = () => {
    if (state === 'correct') return isRTL ? 'תשובה נכונה' : 'Correct answer';
    if (state === 'incorrect') return isRTL ? 'תשובה שגויה' : 'Incorrect answer';
    return isRTL ? 'לחץ לבחירת תשובה' : 'Tap to select this answer';
  };

  return (
    <TouchableOpacity
      onPress={handlePressWithHaptic}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled || state === 'correct' || state === 'incorrect'}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${isRTL ? 'תשובה' : 'Answer'} ${index + 1}: ${text}`}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={{
        disabled: disabled || state === 'correct' || state === 'incorrect',
        selected: state === 'selected',
      }}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        style={[
          styles.button,
          {
            minHeight: isTV ? config.tvTouchTarget : config.touchTarget,
            ...stateStyles,
          },
          scaleTransform,
          isFocused && styles.focused,
          disabled && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: isTV ? config.tvFontSize : config.fontSize,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={3}
        >
          {text}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    justifyContent: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  text: {
    color: colors.text,
    fontWeight: '600',
  },
  focused: {
    borderWidth: 4,
    borderColor: colors.gold,
    transform: [{ scale: 1.05 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export default QuizAnswerButton;
