import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from 'lucide-react';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors } from '@bayit/shared/theme';
import { AuditReport } from '@/services/librarianService';
import { format } from 'date-fns';

interface RecentReportsListProps {
  reports: AuditReport[];
  clearingReports: boolean;
  isRTL: boolean;
  onViewReport: (auditId: string) => void;
  onClearReports: () => void;
}

export const RecentReportsList = ({
  reports,
  clearingReports,
  isRTL,
  onViewReport,
  onClearReports,
}: RecentReportsListProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.reports.title')}
      subtitle={`${reports.length} ${t('admin.librarian.reports.reports', 'reports')}`}
      icon={<FileText size={18} color={colors.primary} />}
      defaultExpanded={false}
    >
      <View className="gap-2">
        {reports.length > 0 && (
          <GlassButton
            title={t('admin.librarian.reports.clearAll')}
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} color={colors.textMuted} />}
            onPress={onClearReports}
            loading={clearingReports}
            disabled={clearingReports}
            className="self-end mb-2"
          />
        )}
        {reports.length === 0 ? (
          <View className="items-center justify-center py-6 gap-2">
            <FileText size={32} color={colors.textMuted} />
            <Text className="text-[13px] text-center" style={{ color: colors.textMuted }}>
              {t('admin.librarian.reports.emptyMessage')}
            </Text>
          </View>
        ) : (
          <ScrollView className="max-h-[400px]" nestedScrollEnabled>
            {reports.slice(0, 10).map((report) => (
              <Pressable
                key={report.audit_id}
                className="p-2 bg-white/10 rounded-lg mb-1 border border-white/10"
                onPress={() => onViewReport(report.audit_id)}
              >
                <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-start gap-1 mb-1`}>
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold" style={{ color: colors.text }}>
                      {format(new Date(report.audit_date), 'MMM d, HH:mm')}
                    </Text>
                    <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                      {t(`admin.librarian.auditTypes.${report.audit_type}`, report.audit_type.replace('_', ' '))}
                    </Text>
                  </View>
                  <GlassBadge
                    text={t(`admin.librarian.status.${report.status}`, report.status)}
                    variant={
                      report.status === 'completed' ? 'success' :
                      report.status === 'failed' ? 'error' : 'warning'
                    }
                  />
                </View>
                <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4 pt-1 border-t`} style={{ borderTopColor: colors.glassBorder }}>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                    {report.issues_count} {t('admin.librarian.reports.issues', 'issues')}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                    {report.fixes_count} {t('admin.librarian.reports.fixes', 'fixes')}
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.textMuted }}>
                    {report.execution_time_seconds.toFixed(1)}s
                  </Text>
                </View>
              </Pressable>
            ))}
            {reports.length > 10 && (
              <Text className="text-xs text-center py-2 italic" style={{ color: colors.textMuted }}>
                +{reports.length - 10} {t('admin.librarian.reports.more', 'more')}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </GlassDraggableExpander>
  );
};
