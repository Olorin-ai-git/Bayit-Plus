/**
 * TalkBackDashboard - Kids voice interaction dashboard
 *
 * Shows conversation history and learning progress for
 * the kids TalkBack voice feature.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('TalkBackDashboard');

interface Conversation {
  id: string;
  topic: string;
  timestamp: string;
  duration: number;
  wordsLearned: number;
}

interface LearningStats {
  totalConversations: number;
  totalMinutes: number;
  averageScore: number;
  currentStreak: number;
}

interface TalkBackDashboardProps {
  profileId: string;
  conversations: Conversation[];
  learningStats: LearningStats;
}

export const TalkBackDashboard: React.FC<TalkBackDashboardProps> = ({
  profileId,
  conversations,
  learningStats,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const renderStatCard = (
    label: string,
    value: string | number,
    iconName: string,
  ) => (
    <GlassCard style={styles.statCard}>
      <NativeIcon name={iconName} size="md" color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <GlassCard
      style={styles.conversationCard}
      accessibilityLabel={t('kids.talkBack.conversationLabel', { topic: item.topic })}
      accessibilityRole="summary"
    >
      <View style={[styles.conversationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.conversationIcon}>
          <NativeIcon name="messageCircle" size="sm" color={colors.primary} />
        </View>
        <View style={styles.conversationInfo}>
          <Text style={[styles.conversationTopic, { textAlign }]} numberOfLines={1}>
            {item.topic}
          </Text>
          <Text style={[styles.conversationMeta, { textAlign }]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
      <View style={[styles.conversationStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.conversationStat, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="clock" size="xs" color={colors.textMuted} />
          <Text style={styles.conversationStatText}>
            {t('kids.talkBack.minutes', { count: item.duration })}
          </Text>
        </View>
        <View style={[styles.conversationStat, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <NativeIcon name="book" size="xs" color={colors.textMuted} />
          <Text style={styles.conversationStatText}>
            {t('kids.talkBack.wordsLearned', { count: item.wordsLearned })}
          </Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('kids.talkBack.dashboardLabel')}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { textAlign }]}>
        {t('kids.talkBack.dashboardTitle')}
      </Text>

      <View style={styles.statsGrid}>
        {renderStatCard(
          t('kids.talkBack.conversations'),
          learningStats.totalConversations,
          'messageCircle',
        )}
        {renderStatCard(
          t('kids.talkBack.totalMinutes'),
          learningStats.totalMinutes,
          'clock',
        )}
        {renderStatCard(
          t('kids.talkBack.avgScore'),
          `${learningStats.averageScore}%`,
          'star',
        )}
        {renderStatCard(
          t('kids.talkBack.streak'),
          learningStats.currentStreak,
          'flame',
        )}
      </View>

      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('kids.talkBack.recentConversations')}
      </Text>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.conversationList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NativeIcon name="messageCircle" size="xl" color={colors.textMuted} />
            <Text style={[styles.emptyText, { textAlign }]}>
              {t('kids.talkBack.noConversations')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1, minWidth: '45%', padding: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', gap: spacing.xs,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  conversationList: { gap: spacing.sm },
  conversationCard: { padding: spacing.md, borderRadius: borderRadius.md },
  conversationHeader: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  conversationIcon: {
    width: 36, height: 36, borderRadius: borderRadius.full,
    backgroundColor: colors.glassMedium, justifyContent: 'center', alignItems: 'center',
  },
  conversationInfo: { flex: 1 },
  conversationTopic: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  conversationMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  conversationStats: { gap: spacing.lg },
  conversationStat: { alignItems: 'center', gap: spacing.xs },
  conversationStatText: { fontSize: fontSize.xs, color: colors.textSecondary },
  emptyContainer: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
