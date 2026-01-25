/**
 * EmptyState Component
 * Beautiful empty state with icon, message, and CTA
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { spacing } from '@olorin/design-tokens';

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
  iconColor = 'rgba(255, 255, 255, 0.3)',
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
          variant="primary"
          onPress={onAction}
          style={styles.actionButton}
          accessibilityLabel={actionLabel}
        >
          {ActionIcon && <ActionIcon size={18} color="#fff" />}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </GlassButton>
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
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
