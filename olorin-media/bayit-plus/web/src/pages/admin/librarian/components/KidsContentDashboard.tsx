import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { GlassDraggableExpander } from '@bayit/shared/ui/web';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { LibrarianStatus, AuditReport } from '@/services/librarianService';

interface KidsContentDashboardProps {
  status: LibrarianStatus | null;
  triggering: boolean;
  reports: AuditReport[];
  onTriggerAudit: (type: 'daily_incremental' | 'ai_agent') => void;
}

export const KidsContentDashboard = ({ status, triggering, reports, onTriggerAudit }: KidsContentDashboardProps) => {
  const { t } = useTranslation();

  return (
    <GlassDraggableExpander
      title={t('admin.librarian.kidsAudit.title', 'Kids Content Health')}
      subtitle={t('admin.librarian.kidsAudit.subtitle', 'Content moderation status')}
      icon={<Bot size={18} color={colors.warning} />}
      defaultExpanded={false}
    >
      <View style={styles.container}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary.DEFAULT }]}>
              {status?.kids_content_stats?.total_kids_items || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('admin.librarian.kidsAudit.totalItems', 'Total Items')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {status?.kids_content_stats?.approved_items || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('admin.librarian.kidsAudit.approved', 'Approved')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {status?.kids_content_stats?.pending_moderation || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('admin.librarian.kidsAudit.pendingReview', 'Pending')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {status?.kids_content_stats?.flagged_items || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t('admin.librarian.kidsAudit.flagged', 'Flagged')}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: colors.glassBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('admin.librarian.kidsAudit.ageDistribution', 'Age Rating Distribution')}
          </Text>
          <View style={styles.ageDistribution}>
            {[3, 5, 7, 10, 12].map((age) => {
              const count = status?.kids_content_stats?.by_age_rating?.[age.toString()] || 0;
              const total = status?.kids_content_stats?.total_kids_items || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <View key={age} style={styles.ageBar}>
                  <Text style={[styles.ageLabel, { color: colors.textMuted }]}>{age}+</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${Math.max(percentage, 2)}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.ageCount, { color: colors.text }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: colors.glassBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('admin.librarian.kidsAudit.categoryBalance', 'Category Balance')}
          </Text>
          <View style={styles.categoryGrid}>
            {Object.entries(status?.kids_content_stats?.by_category || {}).map(([category, count]) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={[styles.categoryName, { color: colors.text }]}>{category}</Text>
                <Text style={[styles.categoryCount, { color: colors.primary.DEFAULT }]}>{count as number}</Text>
              </View>
            ))}
            {Object.keys(status?.kids_content_stats?.by_category || {}).length === 0 && (
              <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>
                {t('admin.librarian.kidsAudit.noCategories', 'No categories yet')}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.actionSection, { borderTopColor: colors.glassBorder }]}>
          <GlassButton
            title={t('admin.librarian.kidsAudit.runAudit', 'Audit Kids Content')}
            variant="secondary"
            size="sm"
            onPress={() => onTriggerAudit('daily_incremental')}
            disabled={triggering || reports.some(r => r.status === 'in_progress')}
            style={styles.actionButton}
          />
        </View>
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ageDistribution: {
    gap: spacing.xs,
  },
  ageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ageLabel: {
    fontSize: 11,
    width: 24,
    textAlign: 'right',
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  ageCount: {
    fontSize: 11,
    width: 28,
    textAlign: 'right',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  categoryName: {
    fontSize: 11,
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 18,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13,
    textAlign: 'center',
  },
  actionSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
  },
});
