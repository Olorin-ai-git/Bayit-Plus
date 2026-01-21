import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScrollText } from 'lucide-react';
import { GlassBadge } from '@bayit/shared/ui';
import { GlassDraggableExpander, GlassLog } from '@bayit/shared/ui/web';
import { colors, spacing } from '@bayit/shared/theme';
import { AuditReportDetail } from '@/services/librarianService';
import { BatchProgress } from '../types';
import { AuditInfoHeader } from './AuditInfoHeader';
import { AuditProgress } from './AuditProgress';
import { AuditCompletionBanner } from './AuditCompletionBanner';

interface LiveAuditLogPanelProps {
  report: AuditReportDetail | null;
  expanded: boolean;
  connectingToLog: boolean;
  refreshing: boolean;
  pausingAudit: boolean;
  resumingAudit: boolean;
  cancellingAudit: boolean;
  auditPaused: boolean;
  batchProgress: BatchProgress | null;
  lastPolledAt: Date | null;
  isRTL: boolean;
  onExpandChange: (expanded: boolean) => void;
  onRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const LiveAuditLogPanel = ({
  report,
  expanded,
  connectingToLog,
  refreshing,
  pausingAudit,
  resumingAudit,
  cancellingAudit,
  auditPaused,
  batchProgress,
  lastPolledAt,
  isRTL,
  onExpandChange,
  onRefresh,
  onPause,
  onResume,
  onCancel,
}: LiveAuditLogPanelProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.logs.liveAuditLog')}
      subtitle={report ? `${t('admin.librarian.logs.auditType')}: ${t(`admin.librarian.auditTypes.${report.audit_type}`, report.audit_type.replace('_', ' '))}` : undefined}
      icon={
        report?.status === 'in_progress' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <ScrollText size={20} color={colors.primary} />
        )
      }
      badge={
        report ? (
          <GlassBadge
            text={t(`admin.librarian.reports.status.${report.status}`)}
            variant={
              report.status === 'completed' ? 'success' :
              report.status === 'in_progress' ? 'warning' :
              report.status === 'failed' ? 'error' : 'info'
            }
          />
        ) : undefined
      }
      defaultExpanded={true}
      onExpandChange={onExpandChange}
      draggable={true}
      minHeight={700}
      maxHeight={1400}
      style={styles.liveLogPanel}
    >
      {connectingToLog ? (
        <View style={styles.connectingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.connectingText}>
            {t('admin.librarian.logs.connecting', 'Connecting to live audit log...')}
          </Text>
        </View>
      ) : report ? (
        <View style={{ flex: 1, minHeight: 0 }}>
          <AuditInfoHeader
            report={report}
            isRTL={isRTL}
            refreshing={refreshing}
            pausingAudit={pausingAudit}
            resumingAudit={resumingAudit}
            cancellingAudit={cancellingAudit}
            auditPaused={auditPaused}
            lastPolledAt={lastPolledAt}
            onRefresh={onRefresh}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
          />

          {report.status === 'in_progress' && batchProgress && (
            <AuditProgress progress={batchProgress} isRTL={isRTL} />
          )}

          {(report.status === 'completed' || report.status === 'failed' || report.status === 'partial') && (
            <AuditCompletionBanner report={report} />
          )}

          {expanded && (
            <View style={{ flex: 1, minHeight: 0 }}>
              <GlassLog
                logs={[...report.execution_logs].reverse()}
                title={t('admin.librarian.logs.executionLog')}
                searchPlaceholder={t('admin.librarian.logs.searchPlaceholder')}
                emptyMessage={t('admin.librarian.logs.noLogs')}
                levelLabels={{
                  debug: t('admin.librarian.logs.levels.debug'),
                  info: t('admin.librarian.logs.levels.info'),
                  warn: t('admin.librarian.logs.levels.warn'),
                  error: t('admin.librarian.logs.levels.error'),
                  success: t('admin.librarian.logs.levels.success'),
                  trace: t('admin.librarian.logs.levels.trace'),
                }}
                showSearch
                showLevelFilter
                showDownload
                autoScroll
                maxHeight={1200}
                animateEntries={false}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <ScrollText size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateText}>
            {t('admin.librarian.logs.noActiveAudit')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {t('admin.librarian.logs.triggerAuditToSee')}
          </Text>
        </View>
      )}
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  liveLogPanel: {
    marginTop: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  connectingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    minHeight: 300,
    gap: spacing.md,
  },
  connectingText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    minHeight: 250,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
