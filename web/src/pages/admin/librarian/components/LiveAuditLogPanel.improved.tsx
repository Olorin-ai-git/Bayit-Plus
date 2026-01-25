import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScrollText, Play, Zap, FileSearch, ShieldCheck, Database } from 'lucide-react';
import { GlassBadge, GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander, GlassLog } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
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
  onTriggerAudit?: (auditType: string) => void;
}

const QUICK_AUDIT_TYPES = [
  {
    type: 'content_validation',
    icon: FileSearch,
    label: 'Content Validation',
    description: 'Verify metadata and content integrity',
    color: '#3b82f6',
  },
  {
    type: 'poster_enrichment',
    icon: ShieldCheck,
    label: 'Poster Enrichment',
    description: 'Update missing posters and artwork',
    color: '#10b981',
  },
  {
    type: 'classification_audit',
    icon: Database,
    label: 'Classification Audit',
    description: 'Review content classifications',
    color: '#f59e0b',
  },
];

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
  onTriggerAudit,
}: LiveAuditLogPanelProps) => {
  const { t } = useTranslation();

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {/* Animated Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <ScrollText size={56} color={colors.primary} />
        </View>
        <View style={styles.pulseRing} />
      </View>

      {/* Title and Description */}
      <Text style={styles.emptyStateTitle}>
        {t('admin.librarian.logs.noActiveAudit', 'No Active Audit')}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {t(
          'admin.librarian.logs.triggerAuditDescription',
          'Launch an audit to monitor execution in real-time and view detailed logs'
        )}
      </Text>

      {/* Quick Audit Type Selector */}
      {onTriggerAudit && (
        <>
          <Text style={styles.quickAuditLabel}>
            {t('admin.librarian.logs.quickAudit', 'Quick Audit')}
          </Text>
          <View style={styles.quickAuditGrid}>
            {QUICK_AUDIT_TYPES.map((audit) => {
              const Icon = audit.icon;
              return (
                <Pressable
                  key={audit.type}
                  style={({ pressed, hovered }) => [
                    styles.quickAuditCard,
                    hovered && styles.quickAuditCardHovered,
                    pressed && styles.quickAuditCardPressed,
                  ]}
                  onPress={() => onTriggerAudit(audit.type)}
                >
                  <View style={[styles.quickAuditIconContainer, { backgroundColor: `${audit.color}20` }]}>
                    <Icon size={24} color={audit.color} />
                  </View>
                  <Text style={styles.quickAuditTitle}>{audit.label}</Text>
                  <Text style={styles.quickAuditDescription}>{audit.description}</Text>
                  <View style={styles.quickAuditArrow}>
                    <Play size={14} color={colors.primary} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Main Trigger Button */}
          <GlassButton
            title={t('admin.librarian.logs.triggerFullAudit', 'Configure & Trigger Full Audit')}
            variant="primary"
            size="lg"
            icon={<Zap size={18} color="#fff" />}
            onPress={() => onTriggerAudit('full')}
            style={styles.triggerButton}
          />
        </>
      )}
    </View>
  );

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.logs.liveAuditLog', 'Live Audit Log')}
      subtitle={
        report
          ? `${t('admin.librarian.logs.auditType', 'Type')}: ${t(
              `admin.librarian.auditTypes.${report.audit_type}`,
              report.audit_type.replace('_', ' ')
            )}`
          : t('admin.librarian.logs.idle', 'Idle')
      }
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
            text={t(`admin.librarian.reports.status.${report.status}`, report.status)}
            variant={
              report.status === 'completed'
                ? 'success'
                : report.status === 'in_progress'
                ? 'warning'
                : report.status === 'failed'
                ? 'error'
                : 'info'
            }
          />
        ) : undefined
      }
      defaultExpanded={true}
      onExpandChange={onExpandChange}
      draggable={true}
      minHeight={700}
      maxHeight={1400}
      style={styles.expanderContainer}
    >
      {connectingToLog ? (
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.connectingText}>
            {t('admin.librarian.logs.connecting', 'Connecting to live audit log...')}
          </Text>
          <Text style={styles.connectingSubtext}>
            {t('admin.librarian.logs.connectingSubtext', 'Establishing secure connection to audit stream')}
          </Text>
        </View>
      ) : report ? (
        <View style={styles.reportContainer}>
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
            <View style={styles.logContainer}>
              <GlassLog
                logs={[...report.execution_logs].reverse()}
                title={t('admin.librarian.logs.executionLog', 'Execution Log')}
                searchPlaceholder={t('admin.librarian.logs.searchPlaceholder', 'Search logs...')}
                emptyMessage={t('admin.librarian.logs.noLogs', 'No execution logs yet')}
                levelLabels={{
                  debug: t('admin.librarian.logs.levels.debug', 'Debug'),
                  info: t('admin.librarian.logs.levels.info', 'Info'),
                  warn: t('admin.librarian.logs.levels.warn', 'Warning'),
                  error: t('admin.librarian.logs.levels.error', 'Error'),
                  success: t('admin.librarian.logs.levels.success', 'Success'),
                  trace: t('admin.librarian.logs.levels.trace', 'Trace'),
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
        renderEmptyState()
      )}
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  expanderContainer: {
    marginTop: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  connectingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl * 2,
    minHeight: 300,
    gap: spacing.sm,
  },
  connectingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  connectingSubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors.textMuted,
  },
  reportContainer: {
    flex: 1,
    minHeight: 0,
  },
  logContainer: {
    flex: 1,
    minHeight: 0,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl * 2,
    minHeight: 500,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    // Animation would be added via Animated API
  },
  emptyStateTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: colors.text,
  },
  emptyStateSubtitle: {
    fontSize: fontSize.base,
    marginBottom: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
    maxWidth: 480,
    lineHeight: 24,
  },
  quickAuditLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  quickAuditGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 900,
  },
  quickAuditCard: {
    width: 260,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'flex-start',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  quickAuditCardHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: `${colors.primary}60`,
    transform: [{ translateY: -2 }],
  },
  quickAuditCardPressed: {
    transform: [{ translateY: 0 }],
  },
  quickAuditIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  quickAuditTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  quickAuditDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  quickAuditArrow: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    opacity: 0.5,
  },
  triggerButton: {
    minWidth: 280,
  },
});
