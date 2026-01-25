import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors } from '@olorin/design-tokens';

export interface GlassToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  isRTL?: boolean;
  /** Accessibility label (defaults to label if not provided) */
  accessibilityLabel?: string;
  /** Accessibility hint describing what happens when toggled */
  accessibilityHint?: string;
}

const SIZES = {
  small: { width: 44, height: 24, knob: 20 },
  medium: { width: 52, height: 28, knob: 24 },
};

export const GlassToggle: React.FC<GlassToggleProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  size = 'medium',
  isRTL = false,
  accessibilityLabel: a11yLabel,
  accessibilityHint,
}) => {
  const dimensions = SIZES[size];

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  // Web keyboard handler for accessibility
  const handleKeyDown = (event: any) => {
    if (Platform.OS === 'web' && !disabled) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onValueChange(!value);
      }
    }
  };

  // Memoize dynamic styles to prevent unnecessary re-renders
  const trackStyle: ViewStyle = useMemo(() => ({
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: dimensions.height / 2,
    alignItems: value ? 'flex-end' : 'flex-start',
    ...(value
      ? { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary }
      : { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.1)' }),
  }), [dimensions, value]);

  const knobStyle: ViewStyle = useMemo(() => ({
    width: dimensions.knob,
    height: dimensions.knob,
    borderRadius: dimensions.knob / 2,
    backgroundColor: value ? colors.text : 'rgba(255, 255, 255, 0.9)',
  }), [dimensions, value]);

  // Accessibility props for the toggle
  const a11yProps = {
    accessibilityRole: 'switch' as const,
    accessibilityLabel: a11yLabel || label || 'Toggle',
    accessibilityHint: accessibilityHint,
    accessibilityState: { checked: value, disabled },
    accessible: true,
  };

  // Web-specific props for keyboard navigation
  const webProps = Platform.OS === 'web' ? {
    // @ts-ignore - Web-specific prop
    tabIndex: disabled ? -1 : 0,
    onKeyDown: handleKeyDown,
  } : {};

  const Toggle = () => (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.track, trackStyle, disabled && styles.disabled]}
      {...a11yProps}
      {...webProps}
    >
      <View style={[styles.knob, knobStyle]} />
    </Pressable>
  );

  if (!label) {
    return <Toggle />;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, isRTL && styles.containerRTL, disabled && styles.disabled]}
      {...a11yProps}
      {...webProps}
    >
      <View style={styles.labelContainer}>
        <Text style={[styles.label, isRTL && styles.textRTL, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.description, isRTL && styles.textRTL]}>
            {description}
          </Text>
        )}
      </View>
      <View pointerEvents="none">
        <View style={[styles.track, trackStyle, disabled && styles.disabled]}>
          <View style={[styles.knob, knobStyle]} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10, // Ensures 44pt minimum touch target height per iOS HIG
    minHeight: 44, // Explicit minimum touch target per iOS HIG
    gap: 16,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    color: colors.textMuted,
  },
  textRTL: {
    textAlign: 'right',
  },
  track: {
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
  },
  knob: {
    elevation: 2,
    boxShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GlassToggle;
