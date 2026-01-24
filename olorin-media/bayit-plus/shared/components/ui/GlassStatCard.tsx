import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.contentContainer}>
        <Text style={[
          compact ? styles.labelCompact : styles.label,
          { color: colors.textMuted }
        ]}>
          {label}
        </Text>
        <Text style={[
          compact ? styles.valueCompact : styles.value,
          { color: colors.text }
        ]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </GlassView>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
};

// Styles using StyleSheet.create() - React Native Web compatible
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

  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  contentContainer: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    fontSize: 13,
    marginBottom: 2,
  },
  labelCompact: {
    fontSize: 11,
    marginBottom: 2,
    flexWrap: 'wrap',
  },

  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  valueCompact: {
    fontSize: 18,
    fontWeight: '600',
  },

  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default GlassStatCard;
