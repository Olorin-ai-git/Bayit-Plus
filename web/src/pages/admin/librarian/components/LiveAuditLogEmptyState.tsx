import { View, Text, StyleSheet } from 'react-native';
import { ScrollText, Play, Bot, Clock } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface LiveAuditLogEmptyStateProps {
  onTriggerDaily: () => void;
  onTriggerAI: () => void;
  lastRunTimestamp: Date | null;
  isRTL: boolean;
  disabled?: boolean;
}

interface AuditTypeCardProps {
  icon: React.ReactNode;
  title: string;
  features: string[];
  onTrigger: () => void;
  disabled: boolean;
  isRTL: boolean;
}

const AuditTypeCard = ({ icon, title, features, onTrigger, disabled, isRTL }: AuditTypeCardProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.cardIconContainer}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardFeatures}>
        {features.map((feature, idx) => (
          <Text key={idx} style={styles.cardFeature}>• {feature}</Text>
        ))}
      </View>
      <GlassButton
        title={t('admin.librarian.logs.emptyState.trigger', 'Trigger')}
        variant="primary"
        onPress={onTrigger}
        disabled={disabled}
        size="sm"
        style={styles.cardButton}
      />
    </View>
  );
};

export const LiveAuditLogEmptyState = ({
  onTriggerDaily,
  onTriggerAI,
  lastRunTimestamp,
  isRTL,
  disabled = false
}: LiveAuditLogEmptyStateProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <ScrollText size={64} color={colors.textMuted} strokeWidth={1.5} />
      </View>

      {/* Title & Description */}
      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('admin.librarian.logs.emptyState.title', 'No Active Audit')}
      </Text>
      <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('admin.librarian.logs.emptyState.description', 'Trigger an audit to see live execution logs')}
      </Text>

      {/* Audit Type Cards */}
      <View style={[styles.cardsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <AuditTypeCard
          icon={<Play size={20} color={colors.primary.DEFAULT} />}
          title={t('admin.librarian.logs.emptyState.dailyTitle', 'Daily Audit')}
          features={[
            t('admin.librarian.logs.emptyState.dailyFeature1', 'Fast'),
            t('admin.librarian.logs.emptyState.dailyFeature2', 'Rule-based'),
            t('admin.librarian.logs.emptyState.dailyFeature3', 'Incremental'),
          ]}
          onTrigger={onTriggerDaily}
          disabled={disabled}
          isRTL={isRTL}
        />
        <AuditTypeCard
          icon={<Bot size={20} color={colors.warning.DEFAULT} />}
          title={t('admin.librarian.logs.emptyState.aiTitle', 'AI Agent Audit')}
          features={[
            t('admin.librarian.logs.emptyState.aiFeature1', 'Intelligent'),
            t('admin.librarian.logs.emptyState.aiFeature2', 'Adaptive'),
            t('admin.librarian.logs.emptyState.aiFeature3', 'Comprehensive'),
          ]}
          onTrigger={onTriggerAI}
          disabled={disabled}
          isRTL={isRTL}
        />
      </View>

      {/* Last Run Timestamp */}
      {lastRunTimestamp && (
        <View style={[styles.lastRunContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={styles.lastRunText}>
            {t('admin.librarian.logs.emptyState.lastRun', 'Last run: {{time}}', {
              time: formatDistanceToNow(lastRunTimestamp, { addSuffix: true })
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  cardsRow: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 600,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIconContainer: {
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  cardFeatures: {
    alignItems: 'flex-start',
    gap: 2,
    marginBottom: spacing.sm,
  },
  cardFeature: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  cardButton: {
    width: '100%',
  },
  lastRunContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  lastRunText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
