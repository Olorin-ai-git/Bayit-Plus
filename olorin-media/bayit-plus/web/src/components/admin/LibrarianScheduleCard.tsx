import { useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, Brain, ExternalLink, Edit2, Check, X } from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassModal, GlassInput } from '@bayit/shared/ui';
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
  onUpdate?: (newCron: string, newStatus: 'ENABLED' | 'DISABLED') => Promise<void>;
}

// Helper to parse cron and make it human-readable
const parseCronToHumanReadable = (cron: string, t: any): string => {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Daily pattern: "0 2 * * *"
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return t('admin.librarian.schedules.patterns.daily', { hour, minute });
  }

  // Weekly pattern: "0 3 * * 0" (Sunday)
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = t(`admin.librarian.schedules.days.${days[parseInt(dayOfWeek)]}`);
    return t('admin.librarian.schedules.patterns.weekly', { day: dayName, hour, minute });
  }

  return cron; // Fallback to raw cron
};

const LibrarianScheduleCard: React.FC<LibrarianScheduleCardProps> = ({
  title,
  cron,
  time,
  mode,
  cost,
  status,
  description,
  gcpProjectId,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const Icon = mode === 'AI Agent' ? Brain : Calendar;

  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newCron, setNewCron] = useState(cron);
  const [newStatus, setNewStatus] = useState(status);
  const [saving, setSaving] = useState(false);

  const handleOpenCloudConsole = () => {
    Linking.openURL(`https://console.cloud.google.com/cloudscheduler?project=${gcpProjectId}`);
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    setSaving(true);
    try {
      await onUpdate(newCron, newStatus);
      setEditModalVisible(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setNewCron(cron);
    setNewStatus(status);
    setEditModalVisible(true);
  };

  const humanReadableSchedule = parseCronToHumanReadable(cron, t);

  return (
    <>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: mode === 'AI Agent' ? colors.secondary : colors.primary }]}>
            <Icon size={24} color={colors.background} />
          </View>
          <GlassBadge
            text={t(`admin.librarian.status.${status.toLowerCase()}`)}
            variant={status === 'ENABLED' ? 'success' : 'error'}
          />
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.title, { textAlign }]}>{title}</Text>
          {onUpdate && (
            <Pressable onPress={handleEdit} style={styles.editButton}>
              <Edit2 size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <DetailRow
            label={t('admin.librarian.schedules.schedule')}
            value={humanReadableSchedule}
            isRTL={isRTL}
          />
          <DetailRow
            label={t('admin.librarian.schedules.time')}
            value={time}
            isRTL={isRTL}
          />
          <DetailRow
            label={t('admin.librarian.schedules.mode')}
            value={mode}
            isRTL={isRTL}
          />
          <DetailRow
            label={t('admin.librarian.schedules.cost')}
            value={cost}
            isRTL={isRTL}
          />
        </View>

        {description && (
          <Text style={[styles.description, { textAlign }]}>{description}</Text>
        )}

        <Pressable style={styles.linkButton} onPress={handleOpenCloudConsole}>
          <Text style={styles.linkText}>{t('admin.librarian.schedules.viewInConsole')}</Text>
          <ExternalLink size={16} color={colors.primary} />
        </Pressable>
      </GlassCard>

      {/* Edit Modal */}
      <GlassModal
        visible={editModalVisible}
        title={t('admin.librarian.schedules.editTitle')}
        onClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalLabel}>{t('admin.librarian.schedules.cronExpression')}</Text>
          <GlassInput
            value={newCron}
            onChangeText={setNewCron}
            placeholder="0 2 * * *"
            style={styles.input}
          />
          <Text style={styles.modalHint}>
            {t('admin.librarian.schedules.cronHint')}
          </Text>

          <Text style={styles.modalLabel}>{t('admin.librarian.schedules.status')}</Text>
          <View style={styles.statusButtons}>
            <Pressable
              style={[
                styles.statusButton,
                newStatus === 'ENABLED' && styles.statusButtonActive,
              ]}
              onPress={() => setNewStatus('ENABLED')}
            >
              <Text style={[
                styles.statusButtonText,
                newStatus === 'ENABLED' && styles.statusButtonTextActive,
              ]}>
                {t('admin.librarian.status.enabled')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.statusButton,
                newStatus === 'DISABLED' && styles.statusButtonActive,
              ]}
              onPress={() => setNewStatus('DISABLED')}
            >
              <Text style={[
                styles.statusButtonText,
                newStatus === 'DISABLED' && styles.statusButtonTextActive,
              ]}>
                {t('admin.librarian.status.disabled')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalActions}>
            <GlassButton
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => setEditModalVisible(false)}
              style={styles.modalButton}
            />
            <GlassButton
              title={t('common.save')}
              variant="primary"
              onPress={handleSave}
              loading={saving}
              style={styles.modalButton}
            />
          </View>
        </View>
      </GlassModal>
    </>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isRTL: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isRTL }) => (
  <View style={styles.detailRow}>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
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
  modalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    marginBottom: spacing.sm,
  },
  modalHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  statusButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  statusButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

export default LibrarianScheduleCard;
