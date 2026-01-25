import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Animated,
  Platform,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface GlassTextareaProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  minHeight?: number;
  hasTVPreferredFocus?: boolean;
}

export const GlassTextarea: React.FC<GlassTextareaProps> = ({
  label,
  error,
  hint,
  minHeight = 100,
  hasTVPreferredFocus = false,
  ...props
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}

      <Animated.View style={scaleTransform}>
        <GlassView
          style={styles.glassContainer}
          intensity="medium"
          borderColor={
            error
              ? colors.error
              : isFocused
                ? colors.glassBorderFocus
                : undefined
          }
        >
          <TextInput
            style={[
              styles.input,
              { minHeight, color: colors.text },
              !error && focusStyle
            ]}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            textAlignVertical="top"
            // @ts-ignore - TV-specific prop
            hasTVPreferredFocus={hasTVPreferredFocus}
            {...props}
          />
        </GlassView>
      </Animated.View>

      {error && (
        <Text style={[styles.helperText, { color: colors.error }]}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          {hint}
        </Text>
      )}
    </View>
  );
};

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textAlign: 'right',
  },

  glassContainer: {
    overflow: 'hidden',
  },

  input: {
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlign: 'right',
  },

  helperText: {
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});

export default GlassTextarea;
