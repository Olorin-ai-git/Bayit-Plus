/**
 * SettingRow Component
 * Reusable row for settings pages - supports toggle, navigation, select, and value display.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassToggle } from '@bayit/shared/ui';
import { ChevronRight } from 'lucide-react';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import type { LucideIcon } from 'lucide-react';

interface SettingRowBaseProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  isRTL?: boolean;
  disabled?: boolean;
}

interface SettingRowToggleProps extends SettingRowBaseProps {
  type: 'toggle';
  value: boolean;
  onValueChange: (value: boolean) => void;
}

interface SettingRowNavigationProps extends SettingRowBaseProps {
  type: 'navigation';
  value?: string;
  onPress: () => void;
}

interface SettingRowValueProps extends SettingRowBaseProps {
  type: 'value';
  value: string;
}

export type SettingRowProps =
  | SettingRowToggleProps
  | SettingRowNavigationProps
  | SettingRowValueProps;

export function SettingRow(props: SettingRowProps) {
  const { icon: Icon, label, description, isRTL = false, disabled = false } = props;
  const rowDir = isRTL ? styles.rowReverse : undefined;

  const content = (
    <View style={[styles.row, rowDir, disabled && styles.disabled]}>
      <View style={[styles.left, rowDir]}>
        {Icon && (
          <View style={styles.iconContainer}>
            <Icon size={18} color={colors.primary.DEFAULT} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.label, isRTL && styles.textRight]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.description, isRTL && styles.textRight]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.right, rowDir]}>
        {props.type === 'toggle' && (
          <GlassToggle
            value={props.value}
            onValueChange={props.onValueChange}
            disabled={disabled}
          />
        )}
        {props.type === 'navigation' && (
          <>
            {props.value && <Text style={styles.valueText}>{props.value}</Text>}
            <ChevronRight size={18} color={colors.textMuted} />
          </>
        )}
        {props.type === 'value' && (
          <Text style={styles.valueText}>{props.value}</Text>
        )}
      </View>
    </View>
  );

  if (props.type === 'navigation') {
    return (
      <Pressable onPress={props.onPress} disabled={disabled}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 48,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  disabled: {
    opacity: 0.5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
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
    lineHeight: 16,
  },
  textRight: {
    textAlign: 'right',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valueText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
