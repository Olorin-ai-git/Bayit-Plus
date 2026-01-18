/**
 * Voice Setting Row Component
 * Displays a single voice setting with toggle
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
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
      style={[styles.settingRow, isRTL && styles.settingRowRTL, disabled && styles.settingRowDisabled]}
    >
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {label}
        </Text>
        <Text style={[styles.settingDesc, isRTL && styles.textRTL, disabled && styles.textDisabled]}>
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
