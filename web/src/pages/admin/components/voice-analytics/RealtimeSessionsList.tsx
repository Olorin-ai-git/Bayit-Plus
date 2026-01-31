import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@bayit/shared/ui';

interface Session {
  session_id: string;
  user_id: string;
  feature_type: string;
  status: string;
  duration_seconds: number;
  estimated_total_cost: number;
  end_to_end_latency_ms: number;
}

interface Props {
  sessions: Session[];
}

export default function RealtimeSessionsList({ sessions }: Props) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>
        {t('admin.voiceManagement.analytics.realtimeSessions', 'Realtime Sessions')}
      </Text>
      {sessions.length === 0 && (
        <Text style={styles.empty}>
          {t('admin.voiceManagement.analytics.noSessions', 'No active sessions')}
        </Text>
      )}
      {sessions.map((session) => (
        <View key={session.session_id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.sessionId}>{session.session_id}</Text>
            <Text style={styles.meta}>
              {session.feature_type} • {session.status}
            </Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.stat}>{(session.duration_seconds / 60).toFixed(1)} min</Text>
            <Text style={styles.stat}>${session.estimated_total_cost.toFixed(4)}</Text>
            <Text style={styles.stat}>{session.end_to_end_latency_ms}ms</Text>
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  empty: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  info: { flex: 1 },
  sessionId: { fontSize: fontSize.sm, color: colors.text, fontFamily: 'monospace' },
  meta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { fontSize: fontSize.xs, color: colors.primary.DEFAULT, fontWeight: '500' },
});
