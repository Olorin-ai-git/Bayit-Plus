/**
 * TalkBackDashboard
 * Parent dashboard showing Talk Back engagement metrics per child profile.
 * Displays response rate, accuracy, shekels earned, and attempt history.
 */

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';
import api from '@/services/api';
import logger from '@/utils/logger';

interface TalkBackDashboardProps {
  profileId: string;
}

interface DashboardStats {
  total_attempts: number;
  total_shekels_earned: number;
  average_accuracy: number;
  hebrew_response_rate: number;
  words_learned: number;
}

interface AttemptRecord {
  point_id: string;
  quality: string;
  accuracy_score: number;
  shekels_earned: number;
  detected_language: string;
  created_at: string;
}

const QUALITY_COLORS: Record<string, string> = {
  exact_match: '#22C55E',
  correct_root: '#3B82F6',
  close_phonetic: '#F59E0B',
  right_language: '#8B5CF6',
  wrong_language: '#EF4444',
  no_response: '#6B7280',
};

export default function TalkBackDashboard({ profileId }: TalkBackDashboardProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, historyData] = await Promise.all([
          api.get('/talk-back/dashboard/overview', { params: { profile_id: profileId } }),
          api.get('/talk-back/dashboard/history', { params: { profile_id: profileId, limit: 20 } }),
        ]);
        setStats(statsData as unknown as DashboardStats);
        setHistory(((historyData as unknown as { attempts: AttemptRecord[] }).attempts) || []);
      } catch (error) {
        logger.error('Failed to fetch Talk Back dashboard', 'TalkBackDashboard', error);
      }
      setLoading(false);
    };
    fetchData();
  }, [profileId]);

  if (loading && !stats) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </GlassCard>
    );
  }

  if (!stats) return null;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{t('talkBack.dashboard.title', 'Talk Back Progress')}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_attempts}</Text>
          <Text style={styles.statLabel}>{t('talkBack.dashboard.attempts', 'Responses')}</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>
            {Math.round(stats.hebrew_response_rate * 100)}%
          </Text>
          <Text style={styles.statLabel}>{t('talkBack.dashboard.hebrewRate', 'Hebrew Rate')}</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>
            {Math.round(stats.average_accuracy * 100)}%
          </Text>
          <Text style={styles.statLabel}>{t('talkBack.dashboard.accuracy', 'Accuracy')}</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.total_shekels_earned}</Text>
          <Text style={styles.statLabel}>{t('talkBack.dashboard.shekels', 'Shekels')}</Text>
        </GlassCard>
      </View>

      {/* History */}
      {history.length > 0 && (
        <GlassCard style={styles.historyCard}>
          <Text style={styles.sectionTitle}>
            {t('talkBack.dashboard.recentAttempts', 'Recent Attempts')}
          </Text>
          {history.map((attempt, idx) => (
            <View key={`${attempt.point_id}-${idx}`} style={styles.attemptRow}>
              <View
                style={[styles.qualityDot, { backgroundColor: QUALITY_COLORS[attempt.quality] || '#6B7280' }]}
              />
              <View style={styles.attemptInfo}>
                <Text style={styles.attemptQuality}>{attempt.quality.replace(/_/g, ' ')}</Text>
                <Text style={styles.attemptMeta}>
                  {Math.round(attempt.accuracy_score * 100)}% | +{attempt.shekels_earned}
                </Text>
              </View>
              <Text style={styles.attemptLang}>{attempt.detected_language}</Text>
            </View>
          ))}
        </GlassCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, gap: spacing.md },
  card: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flex: 1, minWidth: 140, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },
  historyCard: { padding: spacing.md, gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: spacing.xs },
  attemptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  attemptInfo: { flex: 1 },
  attemptQuality: { color: colors.text, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  attemptMeta: { color: colors.textMuted, fontSize: 11 },
  attemptLang: { color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' },
});
