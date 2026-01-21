import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
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

  return (
    <View>
      <TouchableOpacity
        className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        activeOpacity={0.8}
        // @ts-ignore - TV-specific prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Animated.View
          className={`rounded-sm border-2 items-center justify-center ${
            checked ? 'bg-purple-500 border-purple-500' : 'bg-white/10 border-white/20'
          } ${disabled ? 'opacity-50' : ''} ${isRTL ? 'ml-2' : 'mr-2'}`}
          style={[
            {
              width: isTV ? 32 : 24,
              height: isTV ? 32 : 24,
            },
            focusStyle,
            scaleTransform,
          ]}
        >
          {checked && (
            <Text
              className="font-bold"
              style={{
                fontSize: isTV ? 18 : 14,
                color: colors.background,
              }}
            >
              ✓
            </Text>
          )}
        </Animated.View>

        {label && (
          <Text
            className={`text-white ${isRTL ? 'text-right' : 'text-left'} ${disabled ? 'text-gray-500' : ''}`}
            style={{ fontSize: isTV ? 18 : 16 }}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text
          className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export default GlassCheckbox;
