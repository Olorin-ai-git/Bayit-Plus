import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassPageHeader } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { triviaAnalyticsService } from '@/services/triviaAnalyticsApi';
import { logger } from '@/utils/logger';
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants';

interface TriviaStats {
  total_topics: number;
  total_facts_generated: number;
  active_sessions: number;
  content_trivia_count: number;
  enriched_content_count: number;
  content_coverage_percentage: number;
}

interface TriviaTopic {
  topic_text: string;
  entity_type: string;
  channel_id: string;
  detected_at: string;
  mention_count: number;
  confidence_score: number;
  facts_generated: number;
}

export default function TriviaAnalyticsPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TriviaStats | null>(null);
  const [topics, setTopics] = useState<TriviaTopic[]>([]);

  const pageConfig = ADMIN_PAGE_CONFIG.trivia;
  const IconComponent = pageConfig.icon;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, topicsRes] = await Promise.all([
        triviaAnalyticsService.getStats(),
        triviaAnalyticsService.getRecentTopics(10),
      ]);
      setStats(statsRes.data ?? statsRes);
      const topicData = topicsRes.data ?? topicsRes;
      setTopics(topicData.items ?? []);
    } catch (error: any) {
      logger.error('Failed to load trivia analytics', 'TriviaAnalyticsPage', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <GlassPageHeader
        title={t('admin.triviaAnalytics.title', 'Trivia Analytics')}
        subtitle={t('admin.triviaAnalytics.subtitle', 'Monitor live trivia topics, sessions, and content coverage')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        isRTL={isRTL}
      />

      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label={t('admin.triviaAnalytics.totalTopics', 'Topics Detected')} value={stats.total_topics} />
          <StatCard label={t('admin.triviaAnalytics.factsGenerated', 'Facts Generated')} value={stats.total_facts_generated} />
          <StatCard label={t('admin.triviaAnalytics.activeSessions', 'Active Sessions')} value={stats.active_sessions} />
          <StatCard label={t('admin.triviaAnalytics.coverage', 'Content Coverage')} value={`${stats.content_coverage_percentage}%`} />
        </View>
      )}

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t('admin.triviaAnalytics.recentTopics', 'Recent Topics')}</Text>
        {topics.map((topic, idx) => (
          <View key={`${topic.topic_text}-${idx}`} style={styles.topicRow}>
            <View style={styles.topicInfo}>
              <Text style={styles.topicText}>{topic.topic_text}</Text>
              <Text style={styles.topicMeta}>
                {topic.entity_type} • {topic.channel_id} • {topic.mention_count} mentions
              </Text>
            </View>
            <View style={styles.topicStats}>
              <Text style={styles.statValue}>{(topic.confidence_score * 100).toFixed(0)}%</Text>
              <Text style={styles.statLabel}>{t('admin.triviaAnalytics.confidence', 'confidence')}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <GlassCard style={styles.statCard}>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: 150, padding: spacing.lg, alignItems: 'center' },
  statCardValue: { fontSize: fontSize['2xl'], fontWeight: 'bold', color: colors.primary.DEFAULT, marginBottom: spacing.xs },
  statCardLabel: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  card: { marginHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  topicInfo: { flex: 1 },
  topicText: { fontSize: fontSize.base, color: colors.text, fontWeight: '500' },
  topicMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  topicStats: { alignItems: 'center', marginLeft: spacing.md },
  statValue: { fontSize: fontSize.sm, color: colors.primary.DEFAULT, fontWeight: '600' },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted },
});
