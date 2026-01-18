import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { GlassDraggableExpander, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
      <View style={styles.kidsAuditSection}>
        <View style={styles.statsGridCompact}>
          <View style={styles.statBoxCompact}>
            <Text style={[styles.statBoxValue, { color: colors.primary }]}>
              {status?.kids_content_stats?.total_kids_items || 0}
            </Text>
            <Text style={styles.statBoxLabel}>
              {t('admin.librarian.kidsAudit.totalItems', 'Total Items')}
            </Text>
          </View>
          <View style={styles.statBoxCompact}>
            <Text style={[styles.statBoxValue, { color: colors.success }]}>
              {status?.kids_content_stats?.approved_items || 0}
            </Text>
            <Text style={styles.statBoxLabel}>
              {t('admin.librarian.kidsAudit.approved', 'Approved')}
            </Text>
          </View>
          <View style={styles.statBoxCompact}>
            <Text style={[styles.statBoxValue, { color: colors.warning }]}>
              {status?.kids_content_stats?.pending_moderation || 0}
            </Text>
            <Text style={styles.statBoxLabel}>
              {t('admin.librarian.kidsAudit.pendingReview', 'Pending')}
            </Text>
          </View>
          <View style={styles.statBoxCompact}>
            <Text style={[styles.statBoxValue, { color: colors.error }]}>
              {status?.kids_content_stats?.flagged_items || 0}
            </Text>
            <Text style={styles.statBoxLabel}>
              {t('admin.librarian.kidsAudit.flagged', 'Flagged')}
            </Text>
          </View>
        </View>

        <View style={styles.kidsAuditSubsection}>
          <Text style={styles.kidsAuditSubtitle}>
            {t('admin.librarian.kidsAudit.ageDistribution', 'Age Rating Distribution')}
          </Text>
          <View style={styles.ageRatingBars}>
            {[3, 5, 7, 10, 12].map((age) => {
              const count = status?.kids_content_stats?.by_age_rating?.[age.toString()] || 0;
              const total = status?.kids_content_stats?.total_kids_items || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <View key={age} style={styles.ageRatingRow}>
                  <Text style={styles.ageRatingLabel}>{age}+</Text>
                  <View style={styles.ageRatingBarContainer}>
                    <View style={[styles.ageRatingBar, { width: `${Math.max(percentage, 2)}%` }]} />
                  </View>
                  <Text style={styles.ageRatingCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.kidsAuditSubsection}>
          <Text style={styles.kidsAuditSubtitle}>
            {t('admin.librarian.kidsAudit.categoryBalance', 'Category Balance')}
          </Text>
          <View style={styles.categoryTags}>
            {Object.entries(status?.kids_content_stats?.by_category || {}).map(([category, count]) => (
              <View key={category} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{category}</Text>
                <Text style={styles.categoryTagCount}>{count as number}</Text>
              </View>
            ))}
            {Object.keys(status?.kids_content_stats?.by_category || {}).length === 0 && (
              <Text style={styles.emptyStateTextSidebar}>
                {t('admin.librarian.kidsAudit.noCategories', 'No categories yet')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.kidsAuditActions}>
          <GlassButton
            title={t('admin.librarian.kidsAudit.runAudit', 'Audit Kids Content')}
            variant="secondary"
            size="sm"
            onPress={() => onTriggerAudit('daily_incremental')}
            disabled={triggering || reports.some(r => r.status === 'in_progress')}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </GlassDraggableExpander>
  );
};

const styles = StyleSheet.create({
  kidsAuditSection: {
    gap: spacing.md,
  },
  statsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBoxCompact: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    backgroundColor: colors.glassLight,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  kidsAuditSubsection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  kidsAuditSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ageRatingBars: {
    gap: spacing.xs,
  },
  ageRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ageRatingLabel: {
    fontSize: 11,
    color: colors.textMuted,
    width: 24,
    textAlign: 'right',
  },
  ageRatingBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.glassLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ageRatingBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  ageRatingCount: {
    fontSize: 11,
    color: colors.text,
    width: 28,
    textAlign: 'right',
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  categoryTagText: {
    fontSize: 11,
    color: colors.text,
  },
  categoryTagCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
    minWidth: 18,
    textAlign: 'center',
  },
  emptyStateTextSidebar: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  kidsAuditActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
});
