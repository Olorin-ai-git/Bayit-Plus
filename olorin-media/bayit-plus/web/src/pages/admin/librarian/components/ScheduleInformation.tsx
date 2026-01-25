import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing } from '@olorin/design-tokens';
import LibrarianScheduleCard from '@/components/admin/LibrarianScheduleCard';
import { LibrarianConfig } from '@/services/librarianService';

interface ScheduleInformationProps {
  config: LibrarianConfig;
  onUpdate: (newCron: string, newStatus: 'ENABLED' | 'DISABLED') => Promise<void>;
}

export const ScheduleInformation = ({ config, onUpdate }: ScheduleInformationProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.schedules.title')}
      subtitle={t('admin.librarian.schedules.subtitle', 'Automated audit schedules')}
      icon={<Calendar size={18} color={colors.primary} />}
      defaultExpanded={false}
    >
      <View style={styles.container}>
        <LibrarianScheduleCard
          title={t('admin.librarian.schedules.dailyTitle')}
          cron={config.daily_schedule.cron}
          time={config.daily_schedule.time}
          mode={config.daily_schedule.mode}
          cost={config.daily_schedule.cost}
          status={config.daily_schedule.status}
          description={config.daily_schedule.description}
          gcpProjectId={config.gcp_project_id}
          onUpdate={onUpdate}
        />
        <LibrarianScheduleCard
          title={t('admin.librarian.schedules.weeklyTitle')}
          cron={config.weekly_schedule.cron}
          time={config.weekly_schedule.time}
          mode={config.weekly_schedule.mode}
          cost={config.weekly_schedule.cost}
          status={config.weekly_schedule.status}
          description={config.weekly_schedule.description}
          gcpProjectId={config.gcp_project_id}
          onUpdate={onUpdate}
        />
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md, // 16
  },
});
