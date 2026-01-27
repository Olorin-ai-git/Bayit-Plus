/**
 * Native Icon Component for React Native (iOS/tvOS/Android)
 * Uses lucide-react-native for consistent icon rendering with glass styling
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { ICON_REGISTRY, ICON_SIZES, IconSize, GlassLevel } from '../registry/iconRegistry';
import { getIconColor, getIconGlassLevel } from '../registry/iconColorTheme';
import { GLASS_EFFECTS } from '../registry/iconStyling';

export type IconVariant = 'monochrome' | 'colored' | 'gradient';

export interface NativeIconProps {
  name: string;
  size?: IconSize;
  context?: string;
  color?: string;
  style?: any;
  testID?: string;
  variant?: IconVariant;
  withBackground?: boolean;
  glassLevel?: GlassLevel;
  isFocused?: boolean;
  isTV?: boolean;
}

/**
 * Native Icon component that renders lucide icons with optional glass background
 * Maps icon names from the registry to lucide-react-native components
 */
export const NativeIcon: React.FC<NativeIconProps> = ({
  name,
  size = 'md',
  context = 'default',
  color,
  style,
  testID,
  variant = 'monochrome',
  withBackground = false,
  glassLevel,
  isFocused = false,
  isTV = false,
}) => {
  const [localFocused, setLocalFocused] = useState(false);
  const focused = isTV ? isFocused : localFocused;

  const iconDef = ICON_REGISTRY[name];

  if (!iconDef) {
    if (__DEV__) {
      console.warn(`Icon "${name}" not found in registry`);
    }
    return null;
  }

  const IconComponent = (LucideIcons as any)[iconDef.lucideName];

  if (!IconComponent) {
    if (__DEV__) {
      console.warn(`Lucide icon "${iconDef.lucideName}" not found`);
    }
    return null;
  }

  const iconSize = ICON_SIZES[context]?.[size] || ICON_SIZES.default[size];

  // Determine icon color based on variant
  let iconColor = color || '#FFFFFF';
  if (variant === 'colored' || variant === 'gradient') {
    iconColor = color || getIconColor(name);
  }

  // Determine glass level
  const effectLevel = glassLevel || (withBackground ? getIconGlassLevel(name) : undefined);
  const glassEffect = effectLevel ? GLASS_EFFECTS[effectLevel] : null;

  // Build container styles
  let containerStyle: any = [styles.container, style];

  if (withBackground && glassEffect) {
    const containerStyles = StyleSheet.create({
      glassBg: {
        backgroundColor: glassEffect.backgroundColor,
        borderColor: glassEffect.borderColor,
        borderWidth: parseInt(glassEffect.borderWidth),
        borderRadius: 12,
        padding: 12,
      },
    });
    containerStyle.push(containerStyles.glassBg);
  }

  // Apply TV focus states
  if (isTV && focused) {
    const focusStyles = StyleSheet.create({
      tvFocus: {
        transform: [{ scale: 1.15 }],
        opacity: 0.9,
      },
    });
    containerStyle.push(focusStyles.tvFocus);
  }

  return (
    <View
      style={containerStyle}
      testID={testID}
      accessible={true}
      accessibilityRole="image"
    >
      <IconComponent
        size={iconSize}
        color={iconColor}
        strokeWidth={2}
      />
    </View>
  );
};

/**
 * Render a native icon directly (non-hook version)
 */
export function renderNativeIcon(
  name: string,
  size: IconSize = 'md',
  context: string = 'default',
  options?: {
    color?: string;
    variant?: IconVariant;
    withBackground?: boolean;
    glassLevel?: GlassLevel;
    isFocused?: boolean;
    isTV?: boolean;
  }
): React.ReactNode {
  const {
    color,
    variant = 'monochrome',
    withBackground = false,
    glassLevel,
    isFocused = false,
    isTV = false,
  } = options || {};

  return (
    <NativeIcon
      name={name}
      size={size}
      context={context}
      color={color}
      variant={variant}
      withBackground={withBackground}
      glassLevel={glassLevel}
      isFocused={isFocused}
      isTV={isTV}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NativeIcon;
