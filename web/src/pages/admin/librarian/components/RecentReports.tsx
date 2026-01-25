import { View, Text, StyleSheet } from 'react-native';
import { FileText, Eye } from 'lucide-react';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import { GlassTable, GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { AuditReport } from '@/services/librarianService';

interface RecentReportsProps {
  reports: AuditReport[];
  clearingReports: boolean;
  loadingAuditId: string | null;
  onViewReport: (auditId: string) => Promise<void>;
  onClearReports: () => void;
  isRTL: boolean;
}

// Helper: Extract triggered by
const getTriggeredBy = (report: AuditReport): string => {
  if (report.audit_type === 'daily_incremental' || report.audit_type === 'weekly_full') {
    return 'Scheduled';
  }
  return (report as any).summary?.triggered_by || 'Manual';
};

// Helper: Get audit parameters badge
const getAuditParametersBadge = (report: AuditReport): string[] => {
  const filters: string[] = [];
  const summary = (report as any).summary || {};

  if (summary.last_24_hours_only) filters.push('Recent');
  if (summary.cyb_titles_only) filters.push('Titles');
  if (summary.tmdb_posters_only) filters.push('TMDB');
  if (summary.opensubtitles_enabled) filters.push('Subtitles');
  if (summary.classify_only) filters.push('Classification');
  if (summary.remove_duplicates) filters.push('Duplicates');

  return filters;
};

// Helper: Get quick stats preview
const getQuickStats = (report: AuditReport): { issues: number; fixes: number } => {
  return {
    issues: report.issues_count || 0,
    fixes: report.fixes_count || 0,
  };
};

export const RecentReports = ({
  reports,
  clearingReports,
  loadingAuditId,
  onViewReport,
  onClearReports,
  isRTL,
}: RecentReportsProps) => {
  const { t } = useTranslation();

  const columns = [
    {
      key: 'audit_date',
      label: t('admin.librarian.reports.columns.date', 'Date'),
      width: 140,
      render: (value: string) => (
        <Text style={[styles.tableText, { color: colors.text }]}>
          {format(new Date(value), 'MMM d, HH:mm')}
        </Text>
      ),
    },
    {
      key: 'audit_type',
      label: t('admin.librarian.reports.columns.type', 'Type'),
      width: 120,
      render: (value: string) => (
        <Text style={[styles.tableText, { color: colors.text }]}>
          {t(`admin.librarian.auditTypes.${value}`, value)}
        </Text>
      ),
    },
    {
      key: 'triggered_by',
      label: t('admin.librarian.reports.columns.triggeredBy', 'Triggered By'),
      width: 120,
      render: (_: any, row: AuditReport) => {
        const triggeredBy = getTriggeredBy(row);
        return (
          <Text style={[styles.tableText, { color: colors.textMuted, fontSize: fontSize.sm }]}>
            {triggeredBy}
          </Text>
        );
      },
    },
    {
      key: 'parameters',
      label: t('admin.librarian.reports.columns.parameters', 'Parameters'),
      width: 200,
      render: (_: any, row: AuditReport) => {
        const params = getAuditParametersBadge(row);
        return (
          <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {params.slice(0, 3).map((param, idx) => (
              <GlassBadge key={idx} variant="default" size="xs">
                {param}
              </GlassBadge>
            ))}
            {params.length > 3 && (
              <GlassBadge variant="default" size="xs">
                +{params.length - 3}
              </GlassBadge>
            )}
            {params.length === 0 && (
              <Text style={[styles.tableText, { color: colors.textMuted, fontSize: fontSize.xs }]}>
                -
              </Text>
            )}
          </View>
        );
      },
    },
    {
      key: 'stats',
      label: t('admin.librarian.reports.columns.stats', 'Issues / Fixes'),
      width: 100,
      render: (_: any, row: AuditReport) => {
        const stats = getQuickStats(row);
        return (
          <Text style={[styles.tableText, { color: colors.textMuted, fontSize: fontSize.sm }]}>
            {stats.issues} / {stats.fixes}
          </Text>
        );
      },
    },
    {
      key: 'status',
      label: t('admin.librarian.reports.columns.status', 'Status'),
      width: 100,
      render: (value: string) => (
        <GlassBadge
          variant={
            value === 'completed' ? 'success' :
            value === 'failed' ? 'danger' :
            value === 'in_progress' ? 'warning' : 'default'
          }
          size="sm"
        >
          {t(`admin.librarian.status.${value}`, value)}
        </GlassBadge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 80,
      render: (_: any, row: AuditReport) => (
        <GlassButton
          title=""
          variant="ghost"
          size="sm"
          icon={<Eye size={16} color={colors.primary.DEFAULT} />}
          onPress={() => onViewReport(row.audit_id)}
          loading={loadingAuditId === row.audit_id}
          aria-label={t('admin.librarian.reports.viewDetails', 'View Details')}
        />
      ),
    },
  ];

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.reports.title', 'Recent Reports')}
      subtitle={t('admin.librarian.reports.totalReports', '{{count}} report(s)', { count: reports.length })}
      icon={<FileText size={18} color={colors.primary.DEFAULT} />}
      defaultExpanded={false}
      draggable={false}
      minHeight={300}
      maxHeight={500}
      headerActions={
        reports.length > 0 ? (
          <GlassButton
            title={t('admin.librarian.reports.clearAll', 'Clear All')}
            variant="ghost"
            size="sm"
            onPress={onClearReports}
            loading={clearingReports}
            disabled={clearingReports}
          />
        ) : undefined
      }
      style={[styles.reportsSection, { borderColor: colors.glassBorder }]}
    >
      {reports.length === 0 ? (
        <View style={styles.reportsEmpty}>
          <FileText size={32} color={colors.textMuted} />
          <Text style={[styles.reportsEmptyText, { textAlign: isRTL ? 'right' : 'left', color: colors.textMuted }]}>
            {t('admin.librarian.reports.emptyMessage', 'No audit reports yet')}
          </Text>
        </View>
      ) : (
        <GlassTable
          columns={columns}
          data={reports.slice(0, 10)}
          emptyMessage={t('admin.librarian.reports.emptyMessage', 'No reports')}
          isRTL={isRTL}
        />
      )}
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  reportsSection: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  reportsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  reportsEmptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  tableText: {
    fontSize: fontSize.sm,
  },
  badgeRow: {
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
