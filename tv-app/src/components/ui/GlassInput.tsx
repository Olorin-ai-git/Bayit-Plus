import React, { useRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { isTV } from '../../utils/platform';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  hasTVPreferredFocus?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  inputStyle,
  hasTVPreferredFocus = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <GlassView
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
          ]}
          intensity="medium"
          borderColor={
            error
              ? colors.error
              : isFocused
              ? colors.primary
              : undefined
          }
        >
          {icon && <View style={styles.icon}>{icon}</View>}
          <TextInput
            {...props}
            style={[
              styles.input,
              icon ? styles.inputWithIcon : undefined,
              inputStyle,
            ]}
            placeholderTextColor={colors.textMuted}
            onFocus={(e) => {
              handleFocus();
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              handleBlur();
              props.onBlur?.(e);
            }}
            // @ts-ignore - TV-specific prop
            hasTVPreferredFocus={hasTVPreferredFocus}
          />
        </GlassView>
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: spacing.sm,
  },
  inputWithIcon: {
    marginRight: spacing.sm,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});

export default GlassInput;
