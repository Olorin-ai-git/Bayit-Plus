import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, Zap, Calendar } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { LibrarianStatus } from '@/services/librarianService';
import { format } from 'date-fns';

interface SystemStatusStatsProps {
  status: LibrarianStatus | null;
  textAlign: 'left' | 'right' | 'center';
  getHealthColor: (health: string) => string;
}

export const SystemStatusStats = ({ status, textAlign, getHealthColor }: SystemStatusStatsProps) => {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-4">
      <Text className="text-base font-semibold mb-4" style={{ textAlign, color: colors.text }}>
        {t('admin.librarian.stats.title', 'System Status')}
      </Text>
      <View className="flex flex-row flex-wrap gap-2">
        <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
          <Bot size={20} color={getHealthColor(status?.system_health || 'unknown')} />
          <Text className="text-lg font-bold" style={{ color: getHealthColor(status?.system_health || 'unknown') }}>
            {status?.system_health ? t(`admin.librarian.health.${status.system_health}`) : '?'}
          </Text>
          <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.stats.systemHealth')}</Text>
        </View>
        <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
          <RefreshCw size={20} color={colors.primary} />
          <Text className="text-lg font-bold" style={{ color: colors.primary }}>
            {status?.total_audits_last_30_days || 0}
          </Text>
          <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.stats.totalAudits')}</Text>
        </View>
        <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
          <Zap size={20} color={colors.success} />
          <Text className="text-lg font-bold" style={{ color: colors.success }}>
            {status?.total_issues_fixed || 0}
          </Text>
          <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.stats.issuesFixed')}</Text>
        </View>
        <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
          <Calendar size={20} color={colors.textMuted} />
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            {status?.last_audit_date ? format(new Date(status.last_audit_date), 'MMM d') : '-'}
          </Text>
          <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.stats.lastAudit')}</Text>
        </View>
      </View>
    </GlassCard>
  );
};
