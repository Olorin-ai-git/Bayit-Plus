import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from 'lucide-react';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
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
      <View style={styles.container}>
        {reports.length > 0 && (
          <GlassButton
            title={t('admin.librarian.reports.clearAll')}
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} color={colors.textMuted} />}
            onPress={onClearReports}
            loading={clearingReports}
            disabled={clearingReports}
            style={styles.clearButton}
          />
        )}
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {t('admin.librarian.reports.emptyMessage')}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} nestedScrollEnabled>
            {reports.slice(0, 10).map((report) => (
              <Pressable
                key={report.audit_id}
                style={styles.reportCard}
                onPress={() => onViewReport(report.audit_id)}
              >
                <View style={[styles.reportHeader, isRTL && styles.reportHeaderRTL]}>
                  <View style={styles.reportHeaderContent}>
                    <Text style={styles.reportDate}>
                      {format(new Date(report.audit_date), 'MMM d, HH:mm')}
                    </Text>
                    <Text style={styles.reportType}>
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
                <View style={[styles.reportStats, isRTL && styles.reportStatsRTL]}>
                  <Text style={styles.statText}>
                    {report.issues_count} {t('admin.librarian.reports.issues', 'issues')}
                  </Text>
                  <Text style={styles.statText}>
                    {report.fixes_count} {t('admin.librarian.reports.fixes', 'fixes')}
                  </Text>
                  <Text style={styles.statText}>
                    {report.execution_time_seconds.toFixed(1)}s
                  </Text>
                </View>
              </Pressable>
            ))}
            {reports.length > 10 && (
              <Text style={styles.moreText}>
                +{reports.length - 10} {t('admin.librarian.reports.more', 'more')}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  reportCard: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  reportHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  reportHeaderContent: {
    flex: 1,
  },
  reportDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reportType: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  reportStats: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  reportStatsRTL: {
    flexDirection: 'row-reverse',
  },
  statText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  moreText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
});
