import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';
import { voiceManagementService } from '@/services/voiceManagementApi';
import logger from '@/utils/logger';

interface Session {
  session_id: string;
  user_id: string;
  feature_type: string;
  status: string;
  duration_seconds: number;
  estimated_total_cost: number;
  end_to_end_latency_ms: number;
}

export default function VoiceAnalyticsPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await voiceManagementService.getRealtimeSessions();
      setSessions(response.sessions);
    } catch (error: any) {
      logger.error('Failed to load sessions', 'VoiceAnalyticsPanel', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{t('admin.voiceManagement.analytics.realtimeSessions')}</Text>
        {sessions.map((session) => (
          <View key={session.session_id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionId}>{session.session_id}</Text>
              <Text style={styles.sessionMeta}>
                {session.feature_type} • {session.status}
              </Text>
            </View>
            <View style={styles.sessionStats}>
              <Text style={styles.stat}>{(session.duration_seconds / 60).toFixed(1)} min</Text>
              <Text style={styles.stat}>${session.estimated_total_cost.toFixed(4)}</Text>
              <Text style={styles.stat}>{session.end_to_end_latency_ms}ms</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionId: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: 'monospace',
  },
  sessionMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
});
