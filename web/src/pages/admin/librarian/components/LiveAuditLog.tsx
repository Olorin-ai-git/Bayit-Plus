import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MessageSquare, Play } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassLog } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { AuditReportDetail, AuditReport } from '@/services/librarianService';
import { BatchProgress } from '../types';
import { LiveAuditLogEmptyState } from './LiveAuditLogEmptyState';
import { LiveStatusBadge } from './LiveStatusBadge';

interface LiveAuditLogProps {
  livePanelReport: AuditReportDetail | null;
  connectingToLiveLog: boolean;
  batchProgress: BatchProgress | null;
  auditPaused: boolean;
  pausingAudit: boolean;
  resumingAudit: boolean;
  cancellingAudit: boolean;
  interjectingAudit: boolean;
  onPauseAudit: (auditId: string) => void;
  onResumeAudit: (auditId: string) => void;
  onCancelAudit: (auditId: string) => void;
  onInterject: (auditId: string | undefined, message: string) => void;
  onClear: () => void;
  onTriggerDaily: () => void;
  onTriggerAI: () => void;
  reports: AuditReport[];
  triggering: boolean;
  isAuditRunning: boolean;
  lastPolledAt: Date | null;
  isRTL: boolean;
  setInterjectModalVisible: (visible: boolean) => void;
}

export const LiveAuditLog = ({
  livePanelReport,
  connectingToLiveLog,
  batchProgress,
  auditPaused,
  pausingAudit,
  resumingAudit,
  cancellingAudit,
  interjectingAudit,
  onPauseAudit,
  onResumeAudit,
  onCancelAudit,
  onClear,
  onTriggerDaily,
  onTriggerAI,
  reports,
  triggering,
  isAuditRunning,
  lastPolledAt,
  isRTL,
  setInterjectModalVisible,
}: LiveAuditLogProps) => {
  const { t } = useTranslation();

  const getLastRunTimestamp = (): Date | null => {
    const completed = reports.filter(r => r.status === 'completed' || r.status === 'failed');
    if (completed.length === 0) return null;
    return new Date(completed[0].audit_date);
  };

  return (
    <View style={[styles.liveLogSection, { borderColor: colors.glassBorder }]}>
      {/* Header with live badge */}
      {livePanelReport?.status === 'in_progress' ? (
        <View style={[styles.liveHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.liveLogTitle, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>
            {t('admin.librarian.logs.liveAuditLog', 'Live Audit Log')}
          </Text>
          <LiveStatusBadge
            isLive={true}
            lastPolledAt={lastPolledAt}
            isRTL={isRTL}
          />
        </View>
      ) : (
        <Text style={[styles.liveLogTitle, { textAlign: isRTL ? 'right' : 'left', color: colors.text }]}>
          {t('admin.librarian.logs.liveAuditLog', 'Live Audit Log')}
        </Text>
      )}

      {connectingToLiveLog ? (
        <View style={styles.liveLogConnecting}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={[styles.liveLogConnectingText, { textAlign: isRTL ? 'right' : 'left', color: colors.textMuted }]}>
            {t('admin.librarian.logs.connecting', 'Connecting...')}
          </Text>
        </View>
      ) : livePanelReport ? (
        <View>
          {/* Progress bar if running */}
          {livePanelReport.status === 'in_progress' && batchProgress && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarTrack, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.progressBarFill, { width: `${batchProgress.percentage}%`, backgroundColor: colors.primary.DEFAULT }]} />
              </View>
              <Text style={[styles.progressBarText, { textAlign: isRTL ? 'right' : 'left', color: colors.textMuted }]}>
                {batchProgress.percentage}% - {batchProgress.itemsProcessed}/{batchProgress.totalItems} {t('admin.librarian.logs.items', 'items')}
              </Text>
            </View>
          )}

          <GlassLog
            logs={[...livePanelReport.execution_logs].reverse()}
            title=""
            searchPlaceholder={t('admin.librarian.logs.searchPlaceholder', 'Search logs...')}
            emptyMessage={t('admin.librarian.logs.noLogs', 'No logs yet')}
            levelLabels={{
              debug: t('admin.librarian.logs.levels.debug', 'DEBUG'),
              info: t('admin.librarian.logs.levels.info', 'INFO'),
              warn: t('admin.librarian.logs.levels.warn', 'WARN'),
              error: t('admin.librarian.logs.levels.error', 'ERROR'),
              success: t('admin.librarian.logs.levels.success', 'SUCCESS'),
              trace: t('admin.librarian.logs.levels.trace', 'TRACE'),
            }}
            showSearch
            showLevelFilter
            showDownload
            showClear
            autoScroll
            maxHeight={400}
            animateEntries={false}
            onClear={onClear}
          />

          {/* Audit controls if running */}
          {livePanelReport.status === 'in_progress' && (
            <View style={[styles.auditControls, {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: isRTL ? 'flex-start' : 'flex-end'
            }]}>
              <GlassButton
                title={t('admin.librarian.audit.interject', 'Interject')}
                variant="secondary"
                icon={<MessageSquare size={16} color={colors.text} />}
                onPress={() => setInterjectModalVisible(true)}
                disabled={
                  interjectingAudit ||
                  auditPaused ||
                  livePanelReport.status !== 'in_progress'
                }
                size="sm"
              />
              {auditPaused ? (
                <GlassButton
                  title={t('admin.librarian.audit.resume', 'Resume')}
                  variant="primary"
                  icon={<Play size={14} color={colors.background} />}
                  onPress={() => onResumeAudit(livePanelReport.audit_id)}
                  loading={resumingAudit}
                  disabled={resumingAudit}
                  size="sm"
                />
              ) : (
                <GlassButton
                  title={t('admin.librarian.audit.pause', 'Pause')}
                  variant="secondary"
                  onPress={() => onPauseAudit(livePanelReport.audit_id)}
                  loading={pausingAudit}
                  disabled={pausingAudit}
                  size="sm"
                />
              )}
              <GlassButton
                title={t('admin.librarian.audit.cancel', 'Cancel')}
                variant="ghost"
                onPress={() => onCancelAudit(livePanelReport.audit_id)}
                loading={cancellingAudit}
                disabled={cancellingAudit}
                size="sm"
              />
            </View>
          )}
        </View>
      ) : (
        <LiveAuditLogEmptyState
          onTriggerDaily={onTriggerDaily}
          onTriggerAI={onTriggerAI}
          lastRunTimestamp={getLastRunTimestamp()}
          isRTL={isRTL}
          disabled={triggering || isAuditRunning}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  liveLogSection: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  liveHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveLogTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  liveLogConnecting: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 200,
    gap: spacing.md,
  },
  liveLogConnectingText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressBarText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  auditControls: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
