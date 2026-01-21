import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Pause, PlayCircle, XCircle } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
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
    <View className="flex flex-row flex-wrap gap-4 mb-4 pb-4 border-b items-center justify-between" style={{ borderBottomColor: `${colors.text}15` }}>
      <View className="flex-1">
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-1`}>
          <Text className="text-[13px]" style={{ color: colors.textMuted }}>
            {t('admin.librarian.logs.started')}: {format(new Date(report.audit_date), 'HH:mm:ss')}
          </Text>
          {report.status === 'in_progress' && (
            <Text className="text-[13px] ml-4" style={{ color: colors.warning }}>
              ● {t('admin.librarian.status.running', 'Running')}
            </Text>
          )}
        </View>
        {report.completed_at && (
          <Text className="text-[13px]" style={{ color: colors.success }}>
            {t('admin.librarian.logs.completed')}: {format(new Date(report.completed_at), 'HH:mm:ss')}
          </Text>
        )}
        {report.execution_logs && report.execution_logs.length > 0 && (() => {
          const lastLogTime = new Date(report.execution_logs[report.execution_logs.length - 1].timestamp);
          const timeSinceLastLog = Math.floor((Date.now() - lastLogTime.getTime()) / 1000);
          const isStale = report.status === 'in_progress' && timeSinceLastLog > 30;

          return (
            <View>
              <Text className="text-xs mt-1" style={{ color: isStale ? colors.warning : colors.textMuted }}>
                {t('admin.librarian.logs.lastLog', 'Last log')}: {format(lastLogTime, 'HH:mm:ss')}
                {timeSinceLastLog > 5 && ` (${timeSinceLastLog}s ago)`}
              </Text>
              {isStale && (
                <Text className="text-[11px] mt-1 italic" style={{ color: colors.warning }}>
                  ⚠ {t('admin.librarian.logs.staleWarning', 'No new logs for {{seconds}}s - job may be processing or stuck', { seconds: timeSinceLastLog })}
                </Text>
              )}
              {lastPolledAt && report.status === 'in_progress' && (
                <Text className="text-[10px] mt-1 opacity-70" style={{ color: colors.textMuted }}>
                  {t('admin.librarian.logs.pollingStatus', 'Polling active • Last checked')}: {format(lastPolledAt, 'HH:mm:ss')}
                </Text>
              )}
            </View>
          );
        })()}
      </View>

      {report.status === 'in_progress' && (
        <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-4 items-center`}>
          <GlassButton
            title={t('common.refresh', 'Refresh')}
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} color={colors.text} />}
            onPress={onRefresh}
            loading={refreshing}
            disabled={refreshing}
            className="min-w-[120px] bg-white/5 border border-white/10"
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
              className="min-w-[120px] bg-white/5 border border-white/10"
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
              className="min-w-[120px] bg-white/5 border border-white/10"
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
            className="min-w-[120px] bg-white/5 border border-white/10"
            textStyle={{ color: colors.error }}
          />
        </View>
      )}
    </View>
  );
};
