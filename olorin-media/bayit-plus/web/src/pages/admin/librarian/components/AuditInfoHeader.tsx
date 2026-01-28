import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Pause, PlayCircle, XCircle } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { AuditReportDetail } from '@/services/librarianService';
import { format } from 'date-fns';

interface AuditInfoHeaderProps {
  report: AuditReportDetail;
  isRTL: boolean;
  refreshing: boolean;
  pausingAudit: boolean;
  resumingAudit: boolean;
  cancellingAudit: boolean;
  auditPaused: boolean;
  lastPolledAt: Date | null;
  onRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const AuditInfoHeader = ({
  report,
  isRTL,
  refreshing,
  pausingAudit,
  resumingAudit,
  cancellingAudit,
  auditPaused,
  lastPolledAt,
  onRefresh,
  onPause,
  onResume,
  onCancel,
}: AuditInfoHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.infoSection}>
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.timestamp}>
            {t('admin.librarian.logs.started')}: {format(new Date(report.audit_date), 'HH:mm:ss')}
          </Text>
          {report.status === 'in_progress' && (
            <Text style={styles.statusRunning}>
              ● {t('admin.librarian.status.running', 'Running')}
            </Text>
          )}
        </View>
        {report.completed_at && (
          <Text style={styles.completedText}>
            {t('admin.librarian.logs.completed')}: {format(new Date(report.completed_at), 'HH:mm:ss')}
          </Text>
        )}
        {report.execution_logs && report.execution_logs.length > 0 && (() => {
          const lastLogTime = new Date(report.execution_logs[report.execution_logs.length - 1].timestamp);
          const timeSinceLastLog = Math.floor((Date.now() - lastLogTime.getTime()) / 1000);
          const isStale = report.status === 'in_progress' && timeSinceLastLog > 30;

          return (
            <View>
              <Text style={[styles.lastLogText, isStale && styles.lastLogStale]}>
                {t('admin.librarian.logs.lastLog', 'Last log')}: {format(lastLogTime, 'HH:mm:ss')}
                {timeSinceLastLog > 5 && ` (${timeSinceLastLog}s ago)`}
              </Text>
              {isStale && (
                <Text style={styles.staleWarning}>
                  {t('admin.librarian.logs.warning', 'Warning')}: {t('admin.librarian.logs.staleWarning', 'No new logs for {{seconds}}s - job may be processing or stuck', { seconds: timeSinceLastLog })}
                </Text>
              )}
              {lastPolledAt && report.status === 'in_progress' && (
                <Text style={styles.pollingStatus}>
                  {t('admin.librarian.logs.pollingStatus', 'Polling active • Last checked')}: {format(lastPolledAt, 'HH:mm:ss')}
                </Text>
              )}
            </View>
          );
        })()}
      </View>

      {report.status === 'in_progress' && (
        <View style={[styles.actionsContainer, isRTL && styles.rowReverse]}>
          <GlassButton
            title={t('common.refresh', 'Refresh')}
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} color={colors.text} />}
            onPress={onRefresh}
            loading={refreshing}
            disabled={refreshing}
            style={styles.actionButton}
          />
          {!auditPaused ? (
            <GlassButton
              title={t('admin.librarian.audit.pause', 'Pause')}
              variant="secondary"
              size="md"
              icon={<Pause size={16} color={colors.text} />}
              onPress={onPause}
              loading={pausingAudit}
              disabled={pausingAudit || cancellingAudit}
              style={styles.actionButton}
            />
          ) : (
            <GlassButton
              title={t('admin.librarian.audit.resume', 'Resume')}
              variant="secondary"
              size="md"
              icon={<PlayCircle size={16} color={colors.text} />}
              onPress={onResume}
              loading={resumingAudit}
              disabled={resumingAudit || cancellingAudit}
              style={styles.actionButton}
            />
          )}
          <GlassButton
            title={t('admin.librarian.audit.cancel', 'Cancel')}
            variant="secondary"
            size="md"
            icon={<XCircle size={16} color={colors.error} />}
            onPress={onCancel}
            loading={cancellingAudit}
            disabled={pausingAudit || resumingAudit || cancellingAudit}
            style={styles.actionButton}
            textStyle={{ color: colors.error }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.text}15`,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSection: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  timestamp: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusRunning: {
    fontSize: 13,
    marginLeft: spacing.md,
    color: colors.warning.DEFAULT,
  },
  completedText: {
    fontSize: 13,
    color: colors.success.DEFAULT,
  },
  lastLogText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  lastLogStale: {
    color: colors.warning.DEFAULT,
  },
  staleWarning: {
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    color: colors.warning.DEFAULT,
  },
  pollingStatus: {
    fontSize: 10,
    marginTop: spacing.xs,
    opacity: 0.7,
    color: colors.textMuted,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
