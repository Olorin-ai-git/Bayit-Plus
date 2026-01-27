/**
 * Icon Background Component for React Native
 * Reusable wrapper for glassmorphic icon display on iOS/tvOS/Android
 * Provides circular/rounded glass background with glass effects
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { GlassLevel } from '../registry/iconRegistry';
import { GLASS_EFFECTS, ICON_CONTAINER_SIZES } from '../registry/iconStyling';

export type IconBackgroundSize = 'sm' | 'md' | 'lg' | 'xl';

export interface IconBackgroundProps {
  children: React.ReactNode;
  size?: IconBackgroundSize;
  glassLevel?: GlassLevel;
  rounded?: boolean;
  isTV?: boolean;
  isFocused?: boolean;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: any;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Icon Background for native platforms
 * Wraps icons with glassmorphic background and optional interactive states
 */
export const IconBackground = React.forwardRef<View, IconBackgroundProps>(
  (
    {
      children,
      size = 'md',
      glassLevel = 'medium',
      rounded = true,
      isTV = false,
      isFocused = false,
      onPress,
      onFocus,
      onBlur,
      style,
      testID,
      accessibilityLabel,
    },
    ref
  ) => {
    const [localFocused, setLocalFocused] = useState(false);
    const focused = isTV ? isFocused : localFocused;

    const glassEffect = GLASS_EFFECTS[glassLevel];
    const containerSize = ICON_CONTAINER_SIZES[size];

    const baseStyles = StyleSheet.create({
      container: {
        width: parseInt(containerSize.maxWidth),
        height: parseInt(containerSize.maxHeight),
        padding: parseInt(containerSize.padding),
        borderRadius: rounded ? 999 : parseInt(containerSize.borderRadius),
        backgroundColor: glassEffect.backgroundColor,
        borderColor: glassEffect.borderColor,
        borderWidth: parseInt(glassEffect.borderWidth),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      } as any,
      focused: {
        transform: [{ scale: 1.15 }],
        opacity: 0.9,
      } as any,
      blurred: {
        opacity: 0.6,
      } as any,
    });

    let containerStyle: any = [baseStyles.container, style];

    if (isTV) {
      if (focused) {
        containerStyle.push(baseStyles.focused);
      } else {
        containerStyle.push(baseStyles.blurred);
      }
    }

    const content = (
      <View
        ref={ref}
        style={containerStyle}
        testID={testID}
        accessible={true}
        accessibilityLabel={accessibilityLabel || 'Icon background'}
        accessibilityRole={onPress ? 'button' : 'image'}
      >
        {children}
      </View>
    );

    // Wrap with Pressable if we have onPress handler
    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            setLocalFocused(true);
          }}
          onPressOut={() => {
            setLocalFocused(false);
          }}
        >
          {content}
        </Pressable>
      );
    }

    return content;
  }
);

IconBackground.displayName = 'IconBackground';

export default IconBackground;
