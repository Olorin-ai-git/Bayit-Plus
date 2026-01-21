import { View, Text, StyleSheet } from 'react-native';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  buttonLabel,
  onButtonPress,
  compact = false,
}: EmptyStateProps) {
  const containerStyle = compact ? styles.emptySection : styles.emptyState;

  return (
    <GlassView style={containerStyle}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {buttonLabel && onButtonPress && (
        <GlassButton
          label={buttonLabel}
          onPress={onButtonPress}
          style={styles.emptyButton}
        />
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptySection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
