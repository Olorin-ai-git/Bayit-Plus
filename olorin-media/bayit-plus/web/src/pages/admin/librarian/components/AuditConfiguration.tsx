import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Settings, Play, Bot, Minus, Plus } from 'lucide-react';
import { GlassButton, GlassToggle } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { AuditReportDetail, LibrarianConfig } from '@/services/librarianService';

interface AuditConfigurationProps {
  dryRun: boolean;
  setDryRun: (value: boolean) => void;
  budgetLimit: number;
  setBudgetLimit: (value: number) => void;
  last24HoursOnly: boolean;
  setLast24HoursOnly: (value: boolean) => void;
  cybTitlesOnly: boolean;
  setCybTitlesOnly: (value: boolean) => void;
  tmdbPostersOnly: boolean;
  setTmdbPostersOnly: (value: boolean) => void;
  openSubtitlesEnabled: boolean;
  setOpenSubtitlesEnabled: (value: boolean) => void;
  classifyOnly: boolean;
  setClassifyOnly: (value: boolean) => void;
  purgeDuplicates: boolean;
  setPurgeDuplicates: (value: boolean) => void;
  forceUpdates: boolean;
  setForceUpdates: (value: boolean) => void;
  triggering: boolean;
  isAuditRunning: boolean;
  pendingAuditType: string | null;
  auditPaused: boolean;
  pausingAudit: boolean;
  resumingAudit: boolean;
  cancellingAudit: boolean;
  livePanelReport: AuditReportDetail | null;
  config: LibrarianConfig;
  onTriggerAudit: (auditType: 'daily_incremental' | 'ai_agent') => void;
  onPauseAudit: (auditId: string) => void;
  onResumeAudit: (auditId: string) => void;
  onCancelAudit: (auditId: string) => void;
  isRTL: boolean;
}

export const AuditConfiguration = ({
  dryRun,
  setDryRun,
  budgetLimit,
  setBudgetLimit,
  last24HoursOnly,
  setLast24HoursOnly,
  cybTitlesOnly,
  setCybTitlesOnly,
  tmdbPostersOnly,
  setTmdbPostersOnly,
  openSubtitlesEnabled,
  setOpenSubtitlesEnabled,
  classifyOnly,
  setClassifyOnly,
  purgeDuplicates,
  setPurgeDuplicates,
  forceUpdates,
  setForceUpdates,
  triggering,
  isAuditRunning,
  pendingAuditType,
  auditPaused,
  pausingAudit,
  resumingAudit,
  cancellingAudit,
  livePanelReport,
  config,
  onTriggerAudit,
  onPauseAudit,
  onResumeAudit,
  onCancelAudit,
  isRTL,
}: AuditConfigurationProps) => {
  const { t } = useTranslation();

  const handleBudgetDecrease = () => {
    setBudgetLimit(Math.max(config.audit_limits.min_budget_usd, budgetLimit - config.audit_limits.budget_step_usd));
  };

  const handleBudgetIncrease = () => {
    setBudgetLimit(Math.min(config.audit_limits.max_budget_usd, budgetLimit + config.audit_limits.budget_step_usd));
  };

  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.quickActions.title', 'Run Configuration')}
      subtitle={dryRun ? t('admin.librarian.quickActions.previewMode', 'Preview Mode') : t('admin.librarian.quickActions.liveMode', 'Live Mode')}
      icon={<Settings size={18} color={colors.primary.DEFAULT} />}
      defaultExpanded={true}
      draggable={false}
      minHeight={320}
      maxHeight={500}
      style={[styles.configSection, { borderColor: colors.glassBorder }]}
    >
      {/* Toggles Grid - 2 columns */}
      <View style={styles.togglesGrid}>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={last24HoursOnly}
            onValueChange={setLast24HoursOnly}
            label={t('admin.librarian.quickActions.last24Hours', 'Recent Content')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={cybTitlesOnly}
            onValueChange={setCybTitlesOnly}
            label={t('admin.librarian.quickActions.cybTitlesOnly', 'Clean Dirty Titles')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={tmdbPostersOnly}
            onValueChange={setTmdbPostersOnly}
            label={t('admin.librarian.quickActions.tmdbPostersOnly', 'TMDB Posters & Metadata')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={openSubtitlesEnabled}
            onValueChange={setOpenSubtitlesEnabled}
            label={t('admin.librarian.quickActions.openSubtitlesEnabled', 'Acquire Subtitles')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={classifyOnly}
            onValueChange={setClassifyOnly}
            label={t('admin.librarian.quickActions.classifyOnly', 'Verify Classification')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={purgeDuplicates}
            onValueChange={setPurgeDuplicates}
            label={t('admin.librarian.quickActions.purgeDuplicates', 'Remove Duplicates')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={dryRun}
            onValueChange={setDryRun}
            label={t('admin.librarian.quickActions.dryRun', 'Preview Mode')}
            size="small"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.toggleItem}>
          <GlassToggle
            value={forceUpdates}
            onValueChange={setForceUpdates}
            label={t('admin.librarian.quickActions.forceUpdates', 'Force Updates')}
            size="small"
            isRTL={isRTL}
          />
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={[styles.actionButtonsRow, { flexDirection, borderTopColor: colors.glassBorder }]}>
        <GlassButton
          title={t('admin.librarian.quickActions.dailyAudit', 'Daily Audit')}
          variant="primary"
          icon={<Play size={16} color={colors.background} />}
          onPress={() => onTriggerAudit('daily_incremental')}
          loading={triggering && pendingAuditType === 'daily_incremental'}
          disabled={triggering || isAuditRunning}
        />
        <GlassButton
          title={t('admin.librarian.quickActions.aiAgentAudit', 'AI Agent Audit')}
          variant="secondary"
          icon={<Bot size={16} color={colors.text} />}
          onPress={() => onTriggerAudit('ai_agent')}
          loading={triggering && pendingAuditType === 'ai_agent'}
          disabled={triggering || isAuditRunning}
        />

        {/* Budget Control */}
        <View style={[styles.budgetControl, {
          marginLeft: isRTL ? 0 : 'auto',
          marginRight: isRTL ? 'auto' : 0,
          flexDirection
        }]}>
          <Text style={[styles.budgetLabel, { textAlign, color: colors.text }]}>
            {t('admin.librarian.quickActions.budgetPerAudit', 'Budget:')} ${budgetLimit.toFixed(2)}
          </Text>
          <View style={[styles.budgetButtons, { flexDirection }]}>
            <Pressable
              style={[styles.budgetButton, { borderColor: colors.glassBorder }]}
              onPress={handleBudgetDecrease}
            >
              <Minus size={14} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.budgetButton, { borderColor: colors.glassBorder }]}
              onPress={handleBudgetIncrease}
            >
              <Plus size={14} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Running notice with controls */}
      {isAuditRunning && !triggering && (
        <View style={[styles.runningNotice, { borderColor: colors.warning.DEFAULT + '40' }]}>
          <View style={[styles.runningNoticeHeader, { flexDirection }]}>
            <ActivityIndicator size="small" color={colors.warning.DEFAULT} />
            <Text style={[styles.runningNoticeText, { textAlign, color: colors.warning.DEFAULT }]}>
              {t('admin.librarian.quickActions.auditRunningNotice', 'An audit is currently running')}
            </Text>
          </View>
          <View style={[styles.runningNoticeButtons, { flexDirection }]}>
            {auditPaused ? (
              <GlassButton
                title={t('admin.librarian.audit.resume', 'Resume')}
                variant="primary"
                icon={<Play size={14} color={colors.background} />}
                onPress={() => livePanelReport && onResumeAudit(livePanelReport.audit_id)}
                loading={resumingAudit}
                disabled={resumingAudit || !livePanelReport}
                size="sm"
              />
            ) : (
              <GlassButton
                title={t('admin.librarian.audit.pause', 'Pause')}
                variant="secondary"
                onPress={() => livePanelReport && onPauseAudit(livePanelReport.audit_id)}
                loading={pausingAudit}
                disabled={pausingAudit || !livePanelReport}
                size="sm"
              />
            )}
            <GlassButton
              title={t('admin.librarian.audit.cancel', 'Cancel Audit')}
              variant="ghost"
              onPress={() => livePanelReport && onCancelAudit(livePanelReport.audit_id)}
              loading={cancellingAudit}
              disabled={cancellingAudit || !livePanelReport}
              size="sm"
            />
          </View>
        </View>
      )}
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  configSection: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  togglesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleItem: {
    width: 'calc(50% - 16px)',
    minWidth: 220,
  },
  actionButtonsRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  budgetControl: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  budgetButtons: {
    gap: 4,
  },
  budgetButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runningNotice: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  runningNoticeHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  runningNoticeText: {
    fontSize: 13,
    flex: 1,
  },
  runningNoticeButtons: {
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
