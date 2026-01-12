import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { Calendar, Brain, ExternalLink } from 'lucide-react';
import { GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';

interface LibrarianScheduleCardProps {
  title: string;
  cron: string;
  time: string;
  mode: 'Rule-based' | 'AI Agent';
  cost: string;
  status: 'ENABLED' | 'DISABLED';
  description?: string;
  gcpProjectId: string;
}

const LibrarianScheduleCard: React.FC<LibrarianScheduleCardProps> = ({
  title,
  cron,
  time,
  mode,
  cost,
  status,
  description,
  gcpProjectId,
}) => {
  const { isRTL, textAlign } = useDirection();
  const Icon = mode === 'AI Agent' ? Brain : Calendar;

  const handleOpenCloudConsole = () => {
    Linking.openURL(`https://console.cloud.google.com/cloudscheduler?project=${gcpProjectId}`);
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: mode === 'AI Agent' ? colors.secondary : colors.primary }]}>
          <Icon size={24} color={colors.background} />
        </View>
        <GlassBadge
          text={status}
          variant={status === 'ENABLED' ? 'success' : 'error'}
        />
      </View>

      <Text style={[styles.title, { textAlign }]}>{title}</Text>

      <View style={styles.detailsContainer}>
        <DetailRow label="Schedule" value={cron} isRTL={isRTL} />
        <DetailRow label="Time" value={time} isRTL={isRTL} />
        <DetailRow label="Mode" value={mode} isRTL={isRTL} />
        <DetailRow label="Est. Cost" value={cost} isRTL={isRTL} />
      </View>

      {description && (
        <Text style={[styles.description, { textAlign }]}>{description}</Text>
      )}

      <Pressable style={styles.linkButton} onPress={handleOpenCloudConsole}>
        <Text style={styles.linkText}>Modify in Cloud Console</Text>
        <ExternalLink size={16} color={colors.primary} />
      </Pressable>
    </GlassCard>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isRTL: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isRTL }) => (
  <View style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    <Text style={[styles.detailLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{label}:</Text>
    <Text style={[styles.detailValue, { textAlign: isRTL ? 'right' : 'left' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 300,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 2,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default LibrarianScheduleCard;
