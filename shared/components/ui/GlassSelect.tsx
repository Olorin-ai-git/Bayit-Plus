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
    <View className="w-full">
      {label && <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary, textAlign }}>{label}</Text>}

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
            className={`flex-row items-center justify-between px-4 py-4 min-h-[48px] ${disabled ? 'opacity-50' : ''}`}
            style={{ flexDirection }}
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
              className={`text-base flex-1 ${!selectedOption ? 'text-gray-500' : ''}`}
              style={{ textAlign, color: selectedOption ? colors.text : colors.textMuted }}
            >
              {selectedOption?.label || placeholder}
            </Text>
            <Text className="text-xs" style={[{ color: colors.textSecondary }, isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm }]}>▼</Text>
          </GlassView>
        </Animated.View>
      </TouchableOpacity>

      {error && <Text className="text-xs mt-1" style={{ color: colors.error, textAlign }}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center p-8"
          style={{ backgroundColor: colors.overlay }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <GlassView className="w-4/5 max-w-[400px] max-h-[60%] p-2" intensity="high">
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`flex-row items-center justify-between px-4 py-4 rounded-lg ${item.value === value ? 'bg-purple-900/30' : ''} ${item.disabled ? 'opacity-50' : ''}`}
                  style={{ flexDirection }}
                  // @ts-ignore - TV focus
                  hasTVPreferredFocus={index === 0}
                >
                  <Text
                    className={`text-base flex-1 ${item.value === value ? 'font-semibold' : ''}`}
                    style={{
                      textAlign,
                      color: item.value === value ? colors.primary : item.disabled ? colors.textMuted : colors.text
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text className="text-base" style={[{ color: colors.primary }, isRTL ? { marginRight: spacing.sm, marginLeft: 0 } : { marginLeft: spacing.sm }]}>✓</Text>
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
