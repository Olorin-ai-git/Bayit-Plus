import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from 'lucide-react';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      <View style={styles.sidebarSection}>
        {reports.length > 0 && (
          <GlassButton
            title={t('admin.librarian.reports.clearAll')}
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} color={colors.textMuted} />}
            onPress={onClearReports}
            loading={clearingReports}
            disabled={clearingReports}
            style={styles.clearButtonSidebar}
          />
        )}
        {reports.length === 0 ? (
          <View style={styles.emptyStateSidebar}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={styles.emptyStateTextSidebar}>
              {t('admin.librarian.reports.emptyMessage')}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.reportsList} nestedScrollEnabled>
            {reports.slice(0, 10).map((report) => (
              <Pressable
                key={report.audit_id}
                style={styles.reportItemCompact}
                onPress={() => onViewReport(report.audit_id)}
              >
                <View style={[styles.reportItemHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportItemDate}>
                      {format(new Date(report.audit_date), 'MMM d, HH:mm')}
                    </Text>
                    <Text style={styles.reportItemType}>
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
                <View style={[styles.reportItemMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.reportItemMetaText}>
                    {report.issues_count} {t('admin.librarian.reports.issues', 'issues')}
                  </Text>
                  <Text style={styles.reportItemMetaText}>
                    {report.fixes_count} {t('admin.librarian.reports.fixes', 'fixes')}
                  </Text>
                  <Text style={styles.reportItemMetaText}>
                    {report.execution_time_seconds.toFixed(1)}s
                  </Text>
                </View>
              </Pressable>
            ))}
            {reports.length > 10 && (
              <Text style={styles.moreReportsText}>
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
  sidebarSection: {
    gap: spacing.sm,
  },
  clearButtonSidebar: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  emptyStateSidebar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateTextSidebar: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  reportsList: {
    maxHeight: 400,
  },
  reportItemCompact: {
    padding: spacing.sm,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  reportItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  reportItemDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reportItemType: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  reportItemMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  reportItemMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  moreReportsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
});
