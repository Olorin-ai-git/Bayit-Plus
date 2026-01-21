import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Toggle } from './Toggle';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface SettingRowProps {
  icon: any;
  iconColor?: string;
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  isRTL?: boolean;
}

export function SettingRow({
  icon: Icon,
  iconColor = colors.primary,
  label,
  description,
  value,
  onToggle,
  disabled,
  isRTL,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled || !onToggle}
      style={[styles.settingRow, disabled && styles.settingRowDisabled]}
    >
      {isRTL ? (
        <>
          {value !== undefined && onToggle && (
            <Toggle value={value} onToggle={onToggle} disabled={disabled} isRTL={isRTL} />
          )}
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, { textAlign: 'right' }]}>{label}</Text>
            {description && (
              <Text style={[styles.settingDesc, { textAlign: 'right' }]}>{description}</Text>
            )}
          </View>
          <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
            <Icon size={20} color={iconColor} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
            <Icon size={20} color={iconColor} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, { textAlign: 'left' }]}>{label}</Text>
            {description && (
              <Text style={[styles.settingDesc, { textAlign: 'left' }]}>{description}</Text>
            )}
          </View>
          {value !== undefined && onToggle && (
            <Toggle value={value} onToggle={onToggle} disabled={disabled} isRTL={isRTL} />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
