import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors } from '@bayit/shared/theme';
import { LibrarianStatus, AuditReport } from '@/services/librarianService';

interface KidsContentDashboardProps {
  status: LibrarianStatus | null;
  triggering: boolean;
  reports: AuditReport[];
  onTriggerAudit: (type: 'daily_incremental' | 'ai_agent') => void;
}

export const KidsContentDashboard = ({ status, triggering, reports, onTriggerAudit }: KidsContentDashboardProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.kidsAudit.title', 'Kids Content Health')}
      subtitle={t('admin.librarian.kidsAudit.subtitle', 'Content moderation status')}
      icon={<Bot size={18} color={colors.warning} />}
      defaultExpanded={false}
    >
      <View className="gap-4">
        <View className="flex flex-row flex-wrap gap-2">
          <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
            <Text className="text-lg font-bold" style={{ color: colors.primary }}>
              {status?.kids_content_stats?.total_kids_items || 0}
            </Text>
            <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>
              {t('admin.librarian.kidsAudit.totalItems', 'Total Items')}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
            <Text className="text-lg font-bold" style={{ color: colors.success }}>
              {status?.kids_content_stats?.approved_items || 0}
            </Text>
            <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>
              {t('admin.librarian.kidsAudit.approved', 'Approved')}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
            <Text className="text-lg font-bold" style={{ color: colors.warning }}>
              {status?.kids_content_stats?.pending_moderation || 0}
            </Text>
            <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>
              {t('admin.librarian.kidsAudit.pendingReview', 'Pending')}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%] p-2 bg-white/10 rounded-lg items-center gap-1">
            <Text className="text-lg font-bold" style={{ color: colors.error }}>
              {status?.kids_content_stats?.flagged_items || 0}
            </Text>
            <Text className="text-[10px] text-center" style={{ color: colors.textMuted }}>
              {t('admin.librarian.kidsAudit.flagged', 'Flagged')}
            </Text>
          </View>
        </View>

        <View className="mt-2 pt-2 border-t" style={{ borderTopColor: colors.glassBorder }}>
          <Text className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: colors.textMuted }}>
            {t('admin.librarian.kidsAudit.ageDistribution', 'Age Rating Distribution')}
          </Text>
          <View className="gap-1">
            {[3, 5, 7, 10, 12].map((age) => {
              const count = status?.kids_content_stats?.by_age_rating?.[age.toString()] || 0;
              const total = status?.kids_content_stats?.total_kids_items || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <View key={age} className="flex flex-row items-center gap-2">
                  <Text className="text-[11px] w-6 text-right" style={{ color: colors.textMuted }}>{age}+</Text>
                  <View className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
                    <View className="h-full rounded" style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: colors.primary }} />
                  </View>
                  <Text className="text-[11px] w-7 text-right" style={{ color: colors.text }}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-2 pt-2 border-t" style={{ borderTopColor: colors.glassBorder }}>
          <Text className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: colors.textMuted }}>
            {t('admin.librarian.kidsAudit.categoryBalance', 'Category Balance')}
          </Text>
          <View className="flex flex-row flex-wrap gap-1">
            {Object.entries(status?.kids_content_stats?.by_category || {}).map(([category, count]) => (
              <View key={category} className="flex flex-row items-center bg-white/10 px-2 py-1 rounded-lg gap-1">
                <Text className="text-[11px]" style={{ color: colors.text }}>{category}</Text>
                <Text className="text-[10px] font-semibold bg-black/20 px-1 rounded min-w-[18px] text-center" style={{ color: colors.primary }}>{count as number}</Text>
              </View>
            ))}
            {Object.keys(status?.kids_content_stats?.by_category || {}).length === 0 && (
              <Text className="text-[13px] text-center" style={{ color: colors.textMuted }}>
                {t('admin.librarian.kidsAudit.noCategories', 'No categories yet')}
              </Text>
            )}
          </View>
        </View>

        <View className="flex flex-row gap-2 mt-2 pt-2 border-t" style={{ borderTopColor: colors.glassBorder }}>
          <GlassButton
            title={t('admin.librarian.kidsAudit.runAudit', 'Audit Kids Content')}
            variant="secondary"
            size="sm"
            onPress={() => onTriggerAudit('daily_incremental')}
            disabled={triggering || reports.some(r => r.status === 'in_progress')}
            className="flex-1"
          />
        </View>
      </View>
    </GlassDraggableExpander>
  );
};
