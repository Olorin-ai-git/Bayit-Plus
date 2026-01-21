import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { GlassModal, GlassButton, GlassCard, GlassBadge } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { AuditReportDetail, LibrarianConfig } from '@/services/librarianService';

interface ReportDetailModalProps {
  visible: boolean;
  loading: boolean;
  report: AuditReportDetail | null;
  config: LibrarianConfig | null;
  onClose: () => void;
  onViewLogs: (auditId: string) => void;
}

export const ReportDetailModal = ({
  visible,
  loading,
  report,
  config,
  onClose,
  onViewLogs,
}: ReportDetailModalProps) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible={visible}
      title={t('admin.librarian.reports.detailModal.title', {
        id: report?.audit_id.substring(0, config?.ui.id_truncate_length || 8) || '...'
      })}
      onClose={onClose}
    >
      {loading ? (
        <View className="p-8 items-center justify-center min-h-[200px]">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-base" style={{ color: colors.textMuted }}>{t('admin.librarian.loading')}</Text>
        </View>
      ) : report ? (
        <>
          <View className="p-4 border-b items-end" style={{ borderBottomColor: colors.glassBorder }}>
            <GlassButton
              title={t('admin.librarian.reports.viewLogs')}
              variant="secondary"
              icon={<FileText size={16} color={colors.text} />}
              onPress={() => {
                onClose();
                onViewLogs(report.audit_id);
              }}
              className="self-end"
            />
          </View>
          <ScrollView style={{ maxHeight: config?.ui.modal_max_height || 600 }}>
            <GlassCard className="mb-4 p-6">
              <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{t('admin.librarian.reports.detailModal.summary')}</Text>
              <View className="flex flex-row gap-4 mb-2">
                <View className="flex-1">
                  <Text className="text-[13px] mb-1" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.status')}</Text>
                  <GlassBadge
                    text={t(`admin.librarian.status.${report.status}`, report.status)}
                    variant={
                      report.status === 'completed' ? 'success' :
                      report.status === 'failed' ? 'error' : 'warning'
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] mb-1" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.executionTime')}</Text>
                  <Text className="text-xl font-semibold" style={{ color: colors.text }}>{report.execution_time_seconds.toFixed(1)}s</Text>
                </View>
              </View>
              <View className="flex flex-row gap-4 mb-2">
                <View className="flex-1">
                  <Text className="text-[13px] mb-1" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.totalItems')}</Text>
                  <Text className="text-xl font-semibold" style={{ color: colors.text }}>{report.summary.total_items ?? 0}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] mb-1" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.healthyItems')}</Text>
                  <Text className="text-xl font-semibold" style={{ color: colors.text }}>{report.summary.healthy_items ?? 0}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard className="mb-4 p-6">
              <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{t('admin.librarian.reports.detailModal.issuesFound')}</Text>
              {report.audit_type === 'ai_agent' ? (
                <View className="items-center p-6">
                  <Text className="text-[32px] font-bold mb-1" style={{ color: colors.primary }}>{report.summary.issues_found ?? 0}</Text>
                  <Text className="text-xs text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.totalIssues')}</Text>
                  {report.ai_insights && report.ai_insights.length > 0 && (
                    <Text className="text-[13px] mt-2 italic" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.seeInsightsBelow')}</Text>
                  )}
                </View>
              ) : (
                <View className="flex flex-row flex-wrap gap-4">
                  <View className="flex-1 min-w-[45%] items-center p-4 bg-black/20 rounded-xl border" style={{ borderColor: colors.glassBorder }}>
                    <Text className="text-[32px] font-bold mb-1" style={{ color: colors.primary }}>{report.broken_streams?.length ?? 0}</Text>
                    <Text className="text-xs text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.brokenStreams')}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] items-center p-4 bg-black/20 rounded-xl border" style={{ borderColor: colors.glassBorder }}>
                    <Text className="text-[32px] font-bold mb-1" style={{ color: colors.primary }}>{report.missing_metadata?.length ?? 0}</Text>
                    <Text className="text-xs text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.missingMetadata')}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] items-center p-4 bg-black/20 rounded-xl border" style={{ borderColor: colors.glassBorder }}>
                    <Text className="text-[32px] font-bold mb-1" style={{ color: colors.primary }}>{report.misclassifications?.length ?? 0}</Text>
                    <Text className="text-xs text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.misclassifications')}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] items-center p-4 bg-black/20 rounded-xl border" style={{ borderColor: colors.glassBorder }}>
                    <Text className="text-[32px] font-bold mb-1" style={{ color: colors.primary }}>{report.orphaned_items?.length ?? 0}</Text>
                    <Text className="text-xs text-center" style={{ color: colors.textMuted }}>{t('admin.librarian.reports.detailModal.orphanedItems')}</Text>
                  </View>
                </View>
              )}
            </GlassCard>

            <GlassCard className="mb-4 p-6">
              <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{t('admin.librarian.reports.detailModal.fixesApplied')}</Text>
              <View className="items-center p-6">
                <Text className="text-5xl font-bold mb-1" style={{ color: colors.success }}>
                  {report.audit_type === 'ai_agent'
                    ? (report.summary.issues_fixed ?? 0)
                    : (report.fixes_applied?.length ?? 0)}
                </Text>
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  {t('admin.librarian.reports.detailModal.totalFixes', {
                    count: report.audit_type === 'ai_agent'
                      ? (report.summary.issues_fixed ?? 0)
                      : (report.fixes_applied?.length ?? 0)
                  })}
                </Text>
              </View>
            </GlassCard>

            {report.ai_insights && report.ai_insights.length > 0 && (
              <GlassCard className="mb-4 p-6">
                <Text className="text-lg font-semibold mb-4" style={{ color: colors.text }}>{t('admin.librarian.reports.detailModal.aiInsights')}</Text>
                {report.ai_insights.map((insight, index) => (
                  <View key={index} className="flex flex-row mb-2 px-2">
                    <Text className="text-base mt-0.5 mr-2" style={{ color: colors.primary }}>•</Text>
                    <Text className="flex-1 text-sm leading-5" style={{ color: colors.text }}>{insight}</Text>
                  </View>
                ))}
              </GlassCard>
            )}
          </ScrollView>
        </>
      ) : null}
    </GlassModal>
  );
};
