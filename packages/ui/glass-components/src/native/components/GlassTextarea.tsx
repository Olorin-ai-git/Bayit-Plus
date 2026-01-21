/**
 * GlassTextarea Component
 *
 * Multiline text input with glassmorphic styling.
 * Supports labels, error states, hints, and TV focus.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TextInputProps,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface GlassTextareaProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Minimum height */
  minHeight?: number;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic textarea component with TV focus support
 */
export const GlassTextarea: React.FC<GlassTextareaProps> = ({
  label,
  error,
  hint,
  minHeight = 100,
  hasTVPreferredFocus = false,
  isRTL: forceRTL,
  testID,
  ...props
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
  });

  return (
    <View style={styles.container} testID={testID}>
      {label && <Text style={[styles.label, isRTL && styles.labelRTL]}>{label}</Text>}

      <Animated.View style={scaleTransform}>
        <GlassView
          style={[
            styles.inputContainer,
            !error && isFocused ? focusStyle : undefined,
            error && styles.inputError,
          ]}
          intensity="medium"
          borderColor={error ? colors.error : isFocused ? colors.glassBorderFocus : undefined}
        >
          <TextInput
            style={[styles.input, { minHeight }, isRTL && styles.inputRTL]}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            textAlignVertical="top"
            {...({ hasTVPreferredFocus } as object)}
            {...props}
          />
        </GlassView>
      </Animated.View>

      {error && <Text style={[styles.error, isRTL && styles.errorRTL]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, isRTL && styles.hintRTL]}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  labelRTL: {
    textAlign: 'right',
  },
  inputContainer: {
    overflow: 'hidden',
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlign: 'left',
  },
  inputRTL: {
    textAlign: 'right',
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  errorRTL: {
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  hintRTL: {
    textAlign: 'right',
  },
});

export default GlassTextarea;
