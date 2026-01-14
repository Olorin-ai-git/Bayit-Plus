import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface GlassSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  hasTVPreferredFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View style={scaleTransform}>
          <GlassView
            style={[
              styles.select,
              !error && focusStyle,
              error && styles.selectError,
              disabled && styles.selectDisabled,
            ]}
            intensity="medium"
            borderColor={
              error
                ? colors.error
                : isFocused
                  ? colors.glassBorderFocus
                  : undefined
            }
          >
            <Text
              style={[
                styles.selectText,
                !selectedOption && styles.placeholder,
              ]}
            >
              {selectedOption?.label || placeholder}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

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
                    item.value === value && styles.optionSelected,
                    item.disabled && styles.optionDisabled,
                  ]}
                  // @ts-ignore - TV focus
                  hasTVPreferredFocus={index === 0}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                      item.disabled && styles.optionTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
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
    textAlign: 'right',
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
    textAlign: 'right',
  },
  placeholder: {
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    textAlign: 'right',
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
    textAlign: 'right',
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
    marginLeft: spacing.sm,
  },
});

export default GlassSelect;
