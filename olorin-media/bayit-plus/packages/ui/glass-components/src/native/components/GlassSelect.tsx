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
    <View className="w-full" testID={testID}>
      {label && (
        <Text
          className="text-sm font-medium"
          style={{ textAlign, color: colors.textSecondary, marginBottom: spacing.sm }}
        >
          {label}
        </Text>
      )}

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
            className={`items-center justify-between min-h-[48px] ${disabled ? 'opacity-50' : ''}`}
            style={[
              {
                flexDirection,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              },
              error && { borderColor: colors.error },
            ]}
            intensity="medium"
            borderColor={error ? colors.error : isFocused ? colors.glassBorderFocus : undefined}
          >
            <Text
              className={`flex-1 text-base ${!selectedOption ? '' : ''}`}
              style={{
                textAlign,
                color: selectedOption ? colors.text : colors.textMuted,
              }}
            >
              {selectedOption?.label || placeholder}
            </Text>
            <Text
              className="text-xs"
              style={[
                { color: colors.textSecondary },
                isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm },
              ]}
            >
              ▼
            </Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {error && (
        <Text
          className="text-xs"
          style={{ textAlign, color: colors.error, marginTop: spacing.xs }}
        >
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
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: colors.overlay, padding: spacing.xl }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <GlassView
            className="w-4/5 max-w-[400px] max-h-[60%]"
            style={{ padding: spacing.sm }}
            intensity="high"
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`items-center justify-between rounded-md ${
                    item.value === value ? 'bg-[rgba(107,33,168,0.3)]' : ''
                  } ${item.disabled ? 'opacity-50' : ''}`}
                  style={{
                    flexDirection,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  }}
                  {...({ hasTVPreferredFocus: index === 0 } as object)}
                >
                  <Text
                    className={`flex-1 text-base ${
                      item.value === value ? 'font-semibold' : ''
                    }`}
                    style={{
                      textAlign,
                      color: item.disabled
                        ? colors.textMuted
                        : item.value === value
                          ? colors.primary
                          : colors.text,
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text
                      className="text-base"
                      style={[
                        { color: colors.primary },
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

export default GlassSelect;
