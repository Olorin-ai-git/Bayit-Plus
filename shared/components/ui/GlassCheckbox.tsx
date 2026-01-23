import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { colors, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';
import { useDirection } from '../../hooks/useDirection';

interface GlassCheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
}

export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  label,
  checked = false,
  onChange,
  error,
  disabled = false,
  hasTVPreferredFocus = false,
}) => {
  const { isRTL } = useDirection();
  const { handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const handlePress = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  const checkboxSize = isTV ? 32 : 24;

  return (
    <View>
      <TouchableOpacity
        style={[styles.touchable, isRTL && styles.rowReverse]}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          style={[
            styles.checkbox,
            {
              width: checkboxSize,
              height: checkboxSize,
            },
            checked ? styles.checkboxChecked : styles.checkboxUnchecked,
            disabled && styles.disabled,
            isRTL ? styles.marginLeft : styles.marginRight,
            focusStyle,
            scaleTransform,
          ]}
        >
          {checked && (
            <Text style={[styles.checkmark, { fontSize: isTV ? 18 : 14 }]}>
              ✓
            </Text>
          )}
        </Animated.View>

        {label && (
          <Text
            style={[
              styles.label,
              { fontSize: isTV ? 18 : 16 },
              isRTL ? styles.textRight : styles.textLeft,
              disabled && styles.labelDisabled,
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, isRTL ? styles.textRight : styles.textLeft]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  checkbox: {
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  checkboxUnchecked: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
  marginLeft: {
    marginLeft: spacing.sm,
  },
  marginRight: {
    marginRight: spacing.sm,
  },
  checkmark: {
    fontWeight: 'bold',
    color: colors.background,
  },
  label: {
    color: colors.text,
  },
  labelDisabled: {
    color: '#6b7280',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

export default GlassCheckbox;
