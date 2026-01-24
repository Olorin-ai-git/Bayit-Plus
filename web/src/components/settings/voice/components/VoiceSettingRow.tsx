/**
 * Voice Setting Row Component
 * Displays a single voice setting with toggle
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Toggle } from './Toggle';
import { SettingRowProps } from '../types';

export function VoiceSettingRow({
  label,
  description,
  value,
  onToggle,
  disabled,
  isRTL = false,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={[
        styles.row,
        isRTL && styles.rowReverse,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={[
          styles.label,
          isRTL && styles.textRight,
          disabled && styles.labelDisabled,
        ]}>
          {label}
        </Text>
        <Text style={[
          styles.description,
          isRTL && styles.textRight,
          disabled && styles.descriptionDisabled,
        ]}>
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 16,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  disabled: {
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  labelDisabled: {
    color: '#9CA3AF',
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 18,
  },
  descriptionDisabled: {
    color: '#6B7280',
  },
  textRight: {
    textAlign: 'right',
  },
});
