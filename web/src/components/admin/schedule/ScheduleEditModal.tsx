import { View, Text, Pressable, StyleSheet } from 'react-native';
import { z } from 'zod';
import { GlassModal, GlassInput, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';

/**
 * Zod schema for ScheduleEditModal props
 */
export const ScheduleEditModalPropsSchema = z.object({
  visible: z.boolean(),
  cronValue: z.string(),
  statusValue: z.enum(['ENABLED', 'DISABLED']),
  saving: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  onCronChange: z.function().args(z.string()).returns(z.void()),
  onStatusChange: z.function().args(z.enum(['ENABLED', 'DISABLED'])).returns(z.void()),
  onSave: z.function().args().returns(z.promise(z.void())),
  t: z.function().args(z.string()).returns(z.string()),
});

export type ScheduleEditModalProps = z.infer<typeof ScheduleEditModalPropsSchema>;

/**
 * ScheduleEditModal Component
 *
 * Modal dialog for editing cron schedule and status.
 * Provides input fields for cron expression and toggle buttons for status.
 *
 * @component
 * @example
 * ```tsx
 * <ScheduleEditModal
 *   visible={isOpen}
 *   cronValue="0 2 * * *"
 *   statusValue="ENABLED"
 *   saving={false}
 *   onClose={handleClose}
 *   onCronChange={setCron}
 *   onStatusChange={setStatus}
 *   onSave={handleSave}
 *   t={t}
 * />
 * ```
 */
const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  visible,
  cronValue,
  statusValue,
  saving,
  onClose,
  onCronChange,
  onStatusChange,
  onSave,
  t,
}) => {
  // Dynamic button styles based on status
  const getStatusButtonStyle = (status: 'ENABLED' | 'DISABLED') => [
    styles.statusButton,
    statusValue === status ? styles.statusButtonActive : styles.statusButtonInactive,
  ];

  const getStatusTextStyle = (status: 'ENABLED' | 'DISABLED') => [
    styles.statusButtonText,
    statusValue === status ? styles.statusTextActive : styles.statusTextInactive,
  ];

  return (
    <GlassModal
      visible={visible}
      title={t('admin.librarian.schedules.editTitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        {/* Cron Expression Input */}
        <Text style={styles.label}>
          {t('admin.librarian.schedules.cronExpression')}
        </Text>
        <GlassInput
          value={cronValue}
          onChangeText={onCronChange}
          placeholder="0 2 * * *"
          style={styles.inputMargin}
        />
        <Text style={styles.hint}>
          {t('admin.librarian.schedules.cronHint')}
        </Text>

        {/* Status Toggle */}
        <Text style={[styles.label, styles.statusLabel]}>
          {t('admin.librarian.schedules.status')}
        </Text>
        <View style={styles.statusRow}>
          <Pressable
            style={getStatusButtonStyle('ENABLED')}
            onPress={() => onStatusChange('ENABLED')}
          >
            <Text
              style={getStatusTextStyle('ENABLED')}
            >
              {t('admin.librarian.status.enabled')}
            </Text>
          </Pressable>
          <Pressable
            style={getStatusButtonStyle('DISABLED')}
            onPress={() => onStatusChange('DISABLED')}
          >
            <Text
              style={getStatusTextStyle('DISABLED')}
            >
              {t('admin.librarian.status.disabled')}
            </Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <GlassButton
            title={t('common.cancel')}
            variant="secondary"
            onPress={onClose}
            style={styles.actionButton}
          />
          <GlassButton
            title={t('common.save')}
            variant="primary"
            onPress={onSave}
            loading={saving}
            style={styles.actionButton}
          />
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputMargin: {
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  statusLabel: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusButtonActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  statusButtonInactive: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusButtonText: {
    fontSize: fontSize.sm,
  },
  statusTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default ScheduleEditModal;
