/**
 * SettingSlider Component
 * Setting row with a range slider for numeric values.
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import type { LucideIcon } from 'lucide-react';

interface SettingSliderProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  isRTL?: boolean;
  disabled?: boolean;
}

export function SettingSlider({
  icon: Icon,
  label,
  description,
  min,
  max,
  step = 1,
  value,
  onValueChange,
  formatValue,
  isRTL = false,
  disabled = false,
}: SettingSliderProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);
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
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>
      <View style={styles.sliderContainer}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          disabled={disabled}
          style={sliderStyle}
        />
      </View>
    </View>
  );
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
  accentColor: '#A855F7',
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  disabled: {
    opacity: 0.5,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  valueText: {
    fontSize: fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  sliderContainer: {
    paddingHorizontal: spacing.xs,
  },
});
