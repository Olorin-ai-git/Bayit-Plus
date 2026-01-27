/**
 * Native Icon Component for React Native (iOS/tvOS/Android)
 * Uses lucide-react-native for consistent icon rendering
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { ICON_REGISTRY, ICON_SIZES, IconSize } from '../registry/iconRegistry';

export interface NativeIconProps {
  name: string;
  size?: IconSize;
  context?: string;
  color?: string;
  style?: any;
  testID?: string;
}

/**
 * Native Icon component that renders lucide icons
 * Maps icon names from the registry to lucide-react-native components
 */
export const NativeIcon: React.FC<NativeIconProps> = ({
  name,
  size = 'md',
  context = 'default',
  color = '#FFFFFF',
  style,
  testID,
}) => {
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

  return (
    <View style={[styles.container, style]} testID={testID}>
      <IconComponent
        size={iconSize}
        color={color}
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
  color: string = '#FFFFFF'
): React.ReactNode {
  return (
    <NativeIcon
      name={name}
      size={size}
      context={context}
      color={color}
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
