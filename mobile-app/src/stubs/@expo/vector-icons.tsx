/**
 * Expo Vector Icons stub for React Native
 * Provides minimal compatibility for Ionicons
 */

import React from 'react';
import { Text } from 'react-native';

// Stub component for icons
const IconStub: React.FC<any> = (props) => {
  return <Text {...props}>{props.name || '◯'}</Text>;
};

export const Ionicons = IconStub;
export const MaterialIcons = IconStub;
export const FontAwesome = IconStub;
export const Feather = IconStub;

export default {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Feather,
};
