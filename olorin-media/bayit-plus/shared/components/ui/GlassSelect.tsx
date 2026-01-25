import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Platform,
  I18nManager,
  StyleSheet,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing, fontSize } from '@olorin/design-tokens';
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
  /** Override RTL detection */
  isRTL?: boolean;
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
  isRTL: isRTLProp,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Detect RTL from prop, I18nManager, or document direction
  const isRTL = isRTLProp ?? (
    Platform.OS === 'web'
      ? typeof document !== 'undefined' && document.documentElement?.dir === 'rtl'
      : I18nManager.isRTL
  );

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
    <View style={styles.container}>
      {label && (
        <Text style={[styles.labelText, { color: colors.textSecondary, textAlign }]}>
          {label}
        </Text>
      )}

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
              styles.selectButton,
              { flexDirection },
              disabled && styles.disabled
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
                styles.selectedText,
                { textAlign, color: selectedOption ? colors.text : colors.textMuted }
              ]}
            >
              {selectedOption?.label || placeholder}
            </Text>
            <Text style={[
              styles.chevron,
              { color: colors.textSecondary },
              isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm }
            ]}>
              ▼
            </Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.error.DEFAULT, textAlign }]}>
          {error}
        </Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <GlassView style={styles.modalContent} intensity="high">
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  disabled={item.disabled}
                  style={[
                    styles.optionItem,
                    { flexDirection },
                    item.value === value && styles.selectedOption,
                    item.disabled && styles.disabled
                  ]}
                  // @ts-ignore - TV focus
                  hasTVPreferredFocus={index === 0}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.selectedOptionText,
                      {
                        textAlign,
                        color: item.value === value ? colors.primary : item.disabled ? colors.textMuted : colors.text
                      }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={[
                      styles.checkmark,
                      { color: colors.primary },
                      isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm }
                    ]}>
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

// Styles using StyleSheet.create() - React Native Web compatible
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  labelText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },

  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },

  selectedText: {
    fontSize: 16,
    flex: 1,
  },

  chevron: {
    fontSize: 12,
  },

  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },

  disabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  modalContent: {
    width: '80%',
    maxWidth: 400,
    maxHeight: '60%',
    padding: spacing.sm,
  },

  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },

  selectedOption: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)', // purple-900/30
  },

  optionText: {
    fontSize: 16,
    flex: 1,
  },

  selectedOptionText: {
    fontWeight: '600',
  },

  checkmark: {
    fontSize: 16,
  },
});

export default GlassSelect;
