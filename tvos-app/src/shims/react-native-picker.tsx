/**
 * tvos-app Shim: @react-native-picker/picker
 *
 * Provides a basic Picker component for tvOS where the native
 * picker package is not installed. Used by shared
 * family-controls TimeRangePicker component.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface PickerItemProps {
  label: string;
  value: any;
  color?: string;
}

interface PickerProps {
  selectedValue?: any;
  onValueChange?: (value: any, index: number) => void;
  style?: any;
  children?: React.ReactNode;
  enabled?: boolean;
}

/**
 * Shim Picker for tvOS - renders the selected value as text.
 * On tvOS, focus-based selection replaces dropdown pickers.
 */
const Picker: React.FC<PickerProps> & { Item: React.FC<PickerItemProps> } = ({
  selectedValue,
  children,
  style,
}) => {
  // Find the label for the selected value from children
  let selectedLabel = String(selectedValue ?? '');
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<PickerItemProps>(child) && child.props.value === selectedValue) {
      selectedLabel = child.props.label;
    }
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{selectedLabel}</Text>
    </View>
  );
};

Picker.Item = ({ label }: PickerItemProps) => null;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
  },
});

export { Picker };
export default Picker;
