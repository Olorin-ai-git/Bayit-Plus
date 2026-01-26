/**
 * EmptyState Component
 * Beautiful empty state with icon, message, and CTA
 * Uses design tokens exclusively - no hardcoded colors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  iconColor = colors.textMuted,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={64} color={iconColor} strokeWidth={1.5} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction && (
        <GlassButton
          title={actionLabel}
          variant="primary"
          onPress={onAction}
          style={styles.actionButton}
          icon={ActionIcon ? <ActionIcon size={18} color={colors.text} /> : undefined}
          iconPosition="left"
          accessibilityLabel={actionLabel}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.md,
  },
});
