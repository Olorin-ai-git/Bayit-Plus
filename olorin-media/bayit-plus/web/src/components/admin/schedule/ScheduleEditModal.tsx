import { View, Text, Pressable, StyleSheet } from 'react-native';
import { z } from 'zod';
import { GlassModal, GlassInput, GlassButton } from '@bayit/shared/ui';

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
      <View className="p-6 gap-4">
        {/* Cron Expression Input */}
        <Text className="text-sm font-semibold text-white mb-1">
          {t('admin.librarian.schedules.cronExpression')}
        </Text>
        <GlassInput
          value={cronValue}
          onChangeText={onCronChange}
          placeholder="0 2 * * *"
          className="mb-2"
        />
        <Text className="text-xs -mt-2" style={{ color: 'rgb(115, 115, 115)' }}>
          {t('admin.librarian.schedules.cronHint')}
        </Text>

        {/* Status Toggle */}
        <Text className="text-sm font-semibold text-white mb-1">
          {t('admin.librarian.schedules.status')}
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            className="flex-1 py-2 px-4 rounded items-center border"
            style={getStatusButtonStyle('ENABLED')}
            onPress={() => onStatusChange('ENABLED')}
          >
            <Text
              className="text-sm"
              style={getStatusTextStyle('ENABLED')}
            >
              {t('admin.librarian.status.enabled')}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 py-2 px-4 rounded items-center border"
            style={getStatusButtonStyle('DISABLED')}
            onPress={() => onStatusChange('DISABLED')}
          >
            <Text
              className="text-sm"
              style={getStatusTextStyle('DISABLED')}
            >
              {t('admin.librarian.status.disabled')}
            </Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-4 mt-4">
          <GlassButton
            title={t('common.cancel')}
            variant="secondary"
            onPress={onClose}
            className="flex-1"
          />
          <GlassButton
            title={t('common.save')}
            variant="primary"
            onPress={onSave}
            loading={saving}
            className="flex-1"
          />
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusButtonActive: {
    borderColor: 'rgb(168, 85, 247)',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  statusButtonInactive: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusButtonText: {
    fontSize: 14,
  },
  statusTextActive: {
    color: 'rgb(168, 85, 247)',
    fontWeight: '600',
  },
  statusTextInactive: {
    color: 'rgb(156, 163, 175)',
  },
});

export default ScheduleEditModal;
