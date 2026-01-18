import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Zap, Play, Bot } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { LibrarianConfig, AuditReport } from '@/services/librarianService';
import { AuditConfigState } from '../types';
import { AuditCheckbox } from './AuditCheckbox';
import { BudgetControl } from './BudgetControl';

interface AuditControlsPanelProps {
  config: LibrarianConfig;
  reports: AuditReport[];
  auditConfig: AuditConfigState;
  triggering: boolean;
  pendingAuditType: 'daily_incremental' | 'ai_agent' | null;
  onDryRunChange: (value: boolean) => void;
  onLast24HoursChange: (value: boolean) => void;
  onCybTitlesChange: (value: boolean) => void;
  onTmdbPostersChange: (value: boolean) => void;
  onOpenSubtitlesChange: (value: boolean) => void;
  onClassifyChange: (value: boolean) => void;
  onBudgetChange: (value: number) => void;
  onTriggerAudit: (type: 'daily_incremental' | 'ai_agent') => void;
}

export const AuditControlsPanel = ({
  config,
  reports,
  auditConfig,
  triggering,
  pendingAuditType,
  onDryRunChange,
  onLast24HoursChange,
  onCybTitlesChange,
  onTmdbPostersChange,
  onOpenSubtitlesChange,
  onClassifyChange,
  onBudgetChange,
  onTriggerAudit,
}: AuditControlsPanelProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.quickActions.title')}
      subtitle={t('admin.librarian.quickActions.subtitle', 'Configure and trigger audits')}
      icon={<Zap size={20} color={colors.primary} />}
      defaultExpanded={false}
      draggable={true}
      minHeight={450}
      maxHeight={700}
      style={styles.actionsCard}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.auditMode', 'Audit Mode')}</Text>
        <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.auditModeHelp', 'Choose what to check')}</Text>

        <AuditCheckbox
          checked={auditConfig.dryRun}
          onPress={() => onDryRunChange(!auditConfig.dryRun)}
          label={t('admin.librarian.quickActions.dryRun')}
          helper={t('admin.librarian.quickActions.dryRunHelp', 'Report issues without making changes')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.scopeFilters', 'Scope Filters')}</Text>
        <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.scopeFiltersHelp', 'Optional - Leave all unchecked to audit everything')}</Text>

        <AuditCheckbox
          checked={auditConfig.last24HoursOnly}
          onPress={() => onLast24HoursChange(!auditConfig.last24HoursOnly)}
          label={t('admin.librarian.quickActions.last24Hours')}
          helper={t('admin.librarian.quickActions.last24HoursHelp', 'Only recently added content')}
        />

        <AuditCheckbox
          checked={auditConfig.cybTitlesOnly}
          onPress={() => onCybTitlesChange(!auditConfig.cybTitlesOnly)}
          label={t('admin.librarian.quickActions.cybTitlesOnly')}
          helper={t('admin.librarian.quickActions.cybTitlesOnlyHelp', 'Focus on title cleanup')}
        />

        <AuditCheckbox
          checked={auditConfig.tmdbPostersOnly}
          onPress={() => onTmdbPostersChange(!auditConfig.tmdbPostersOnly)}
          label={t('admin.librarian.quickActions.tmdbPostersOnly')}
          helper={t('admin.librarian.quickActions.tmdbPostersOnlyHelp', 'Focus on posters & metadata')}
        />

        <AuditCheckbox
          checked={auditConfig.openSubtitlesEnabled}
          onPress={() => onOpenSubtitlesChange(!auditConfig.openSubtitlesEnabled)}
          label={t('admin.librarian.quickActions.openSubtitlesEnabled', 'Subtitles Only (OpenSubtitles)')}
          helper={t('admin.librarian.quickActions.openSubtitlesEnabledHelp', 'Download subtitles from OpenSubtitles only')}
        />

        <AuditCheckbox
          checked={auditConfig.classifyOnly}
          onPress={() => onClassifyChange(!auditConfig.classifyOnly)}
          label={t('admin.librarian.quickActions.classifyOnly', 'Classify Content')}
          helper={t('admin.librarian.quickActions.classifyOnlyHelp', 'Verify and fix content categorization')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.librarian.quickActions.auditType', 'Audit Type')}</Text>
        <Text style={styles.sectionSubtitle}>{t('admin.librarian.quickActions.auditTypeHelp', 'Choose between rule-based or AI-powered audit')}</Text>

        <View style={styles.auditTypeCard}>
          <View style={styles.auditTypeHeader}>
            <Play size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.auditTypeTitle}>{t('admin.librarian.quickActions.dailyAudit', 'Daily Audit')}</Text>
              <Text style={styles.auditTypeBadge}>{t('admin.librarian.quickActions.dailyBadge', 'Rule-Based • Fast • Free')}</Text>
            </View>
          </View>
          <Text style={styles.auditTypeDescription}>
            {t('admin.librarian.quickActions.dailyDescription', 'Runs predefined checks on content modified in the last 7 days. Fast and predictable, no AI costs.')}
          </Text>
          <GlassButton
            title={t('admin.librarian.quickActions.triggerDaily')}
            variant="primary"
            icon={<Play size={16} color={colors.background} />}
            onPress={() => onTriggerAudit('daily_incremental')}
            loading={triggering && pendingAuditType === 'daily_incremental'}
            disabled={triggering || reports.some(r => r.status === 'in_progress')}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        <View style={styles.auditTypeCard}>
          <View style={styles.auditTypeHeader}>
            <Bot size={20} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.auditTypeTitle}>{t('admin.librarian.quickActions.aiAgentAudit', 'AI Agent Audit')}</Text>
              <Text style={[styles.auditTypeBadge, { color: colors.secondary }]}>{t('admin.librarian.quickActions.aiAgentBadge', 'AI-Powered • Intelligent • Uses Budget')}</Text>
            </View>
          </View>
          <Text style={styles.auditTypeDescription}>
            {t('admin.librarian.quickActions.aiAgentDescription', 'Autonomous AI agent (Claude) makes intelligent decisions about what to check and fix. More comprehensive but uses API budget.')}
          </Text>
          <GlassButton
            title={t('admin.librarian.quickActions.triggerAI')}
            variant="secondary"
            icon={<Bot size={16} color={colors.text} />}
            onPress={() => onTriggerAudit('ai_agent')}
            loading={triggering && pendingAuditType === 'ai_agent'}
            disabled={triggering || reports.some(r => r.status === 'in_progress')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>

      {reports.some(r => r.status === 'in_progress') && !triggering && (
        <View style={styles.auditRunningNotice}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={styles.auditRunningText}>
            {t('admin.librarian.quickActions.auditRunningNotice', 'An audit is currently running. Buttons will be enabled when it completes.')}
          </Text>
        </View>
      )}

      <BudgetControl
        budgetLimit={auditConfig.budgetLimit}
        budgetUsed={auditConfig.budgetUsed}
        config={config}
        onBudgetChange={onBudgetChange}
      />
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  actionsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  auditTypeCard: {
    padding: spacing.md,
    backgroundColor: colors.glassBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  auditTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  auditTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  auditTypeBadge: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  auditTypeDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  auditRunningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    marginBottom: spacing.md,
  },
  auditRunningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
});
