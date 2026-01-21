/**
 * Expo Vector Icons Platform Shim for React Native
 *
 * Provides compatibility layer for @expo/vector-icons imports.
 * This shim renders icon names as text placeholders.
 * For production, use react-native-vector-icons directly.
 */

import React from 'react';
import { Text } from 'react-native';

const IconPlaceholder: React.FC<any> = (props) => {
  return <Text {...props}>{props.name || '◯'}</Text>;
};

export const Ionicons = IconPlaceholder;
export const MaterialIcons = IconPlaceholder;
export const FontAwesome = IconPlaceholder;
export const Feather = IconPlaceholder;

export default {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Feather,
};
