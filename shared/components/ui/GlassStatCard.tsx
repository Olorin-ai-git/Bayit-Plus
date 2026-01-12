import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassView } from './GlassView';

export interface GlassStatCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
  compact?: boolean;
  style?: any;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({
  icon,
  iconColor = colors.primary,
  iconBgColor,
  label,
  value,
  subtitle,
  onPress,
  compact = false,
  style,
}) => {
  const bgColor = iconBgColor || `${iconColor}20`;

  const content = (
    <GlassView style={[compact ? styles.containerCompact : styles.container, style]}>
      <View style={styles.iconWrapper}>
        {icon}
      </View>
      <View style={styles.content}>
        <Text style={[compact ? styles.labelCompact : styles.label]}>{label}</Text>
        <Text style={[compact ? styles.valueCompact : styles.value]}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </GlassView>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 80,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  labelCompact: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  valueCompact: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default GlassStatCard;
