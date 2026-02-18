/**
 * SettingSelect Component
 * Setting row with a dropdown/picker for selecting from options.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import type { LucideIcon } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
}

interface SettingSelectProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  isRTL?: boolean;
  disabled?: boolean;
}

export function SettingSelect({
  icon: Icon,
  label,
  description,
  options,
  value,
  onValueChange,
  isRTL = false,
  disabled = false,
}: SettingSelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const rowDir = isRTL ? styles.rowReverse : undefined;

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={[styles.labelRow, rowDir]}>
        {Icon && (
          <View style={styles.iconContainer}>
            <Icon size={18} color={colors.primary.DEFAULT} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.label, isRTL && styles.textRight]}>{label}</Text>
          {description && (
            <Text style={[styles.description, isRTL && styles.textRight]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.optionsRow, isRTL && styles.rowReverse]}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onValueChange(option.value)}
            disabled={disabled}
            style={[
              styles.option,
              option.value === value && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                option.value === value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  disabled: {
    opacity: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  optionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});
