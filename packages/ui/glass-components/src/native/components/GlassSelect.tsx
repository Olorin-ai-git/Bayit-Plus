/**
 * GlassSelect Component
 *
 * Glassmorphic dropdown select with modal picker.
 * Supports RTL, TV focus, and accessibility.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  I18nManager,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Disable this option */
  disabled?: boolean;
}

export interface GlassSelectProps {
  /** Select label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Available options */
  options: SelectOption[];
  /** Selected value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic select component with TV focus support
 */
export const GlassSelect: React.FC<GlassSelectProps> = ({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  hasTVPreferredFocus = false,
  isRTL: isRTLProp,
  testID,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Detect RTL from prop, I18nManager, or document direction
  const isRTL =
    isRTLProp ??
    (Platform.OS === 'web'
      ? typeof document !== 'undefined' && document.documentElement?.dir === 'rtl'
      : I18nManager.isRTL);

  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'input',
  });

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  // Dynamic text alignment based on direction
  const textAlign = isRTL ? 'right' : 'left';
  const flexDirection = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={styles.container} testID={testID}>
      {label && <Text style={[styles.label, { textAlign }]}>{label}</Text>}

      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        {...({ hasTVPreferredFocus } as object)}
      >
        <Animated.View style={scaleTransform}>
          <GlassView
            style={[
              styles.select,
              { flexDirection },
              !error && isFocused ? focusStyle : undefined,
              error && styles.selectError,
              disabled && styles.selectDisabled,
            ]}
            intensity="medium"
            borderColor={error ? colors.error : isFocused ? colors.glassBorderFocus : undefined}
          >
            <Text style={[styles.selectText, { textAlign }, !selectedOption && styles.placeholder]}>
              {selectedOption?.label || placeholder}
            </Text>
            <Text
              style={[
                styles.chevron,
                isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm },
              ]}
            >
              ▼
            </Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {error && <Text style={[styles.error, { textAlign }]}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <GlassView style={styles.dropdown} intensity="high">
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  disabled={item.disabled}
                  style={[
                    styles.option,
                    { flexDirection },
                    item.value === value && styles.optionSelected,
                    item.disabled && styles.optionDisabled,
                  ]}
                  {...({ hasTVPreferredFocus: index === 0 } as object)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { textAlign },
                      item.value === value && styles.optionTextSelected,
                      item.disabled && styles.optionTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text
                      style={[
                        styles.checkmark,
                        isRTL
                          ? { marginRight: spacing.sm, marginLeft: 0 }
                          : { marginLeft: spacing.sm },
                      ]}
                    >
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </GlassView>
        </TouchableOpacity>
      </Modal>
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
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  selectError: {
    borderColor: colors.error,
  },
  selectDisabled: {
    opacity: 0.5,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dropdown: {
    width: '80%',
    maxWidth: 400,
    maxHeight: '60%',
    padding: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: colors.textMuted,
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary,
  },
});

export default GlassSelect;
