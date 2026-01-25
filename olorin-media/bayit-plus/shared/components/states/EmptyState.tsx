/**
 * EmptyState - Highly visible empty state component
 * Used across all content pages for consistent empty experience
 */

import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  backgroundColor?: string;
  titleColor?: string;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  backgroundColor,
  titleColor = colors.text,
  testID = 'empty-state',
}: EmptyStateProps) {
  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="text"
    >
      <GlassCard style={[styles.card, backgroundColor && { backgroundColor }]}>
        <View accessibilityLabel={title}>
          {icon}
        </View>
        <Text style={[styles.title, { color: titleColor }]}>
          {title}
        </Text>
        <Text style={styles.description}>
          {description}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 500,
    paddingVertical: 80,
  },
  card: {
    padding: 56,
    alignItems: 'center',
    gap: 20,
    maxWidth: 500,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
});
