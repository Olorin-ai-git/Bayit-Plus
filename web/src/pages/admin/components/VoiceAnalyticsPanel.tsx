import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { voiceManagementService } from '@/services/voiceManagementApi';
import { logger } from '@/utils/logger';

import LatencyMetricsCard from './voice-analytics/LatencyMetricsCard';
import UsageChartsCard from './voice-analytics/UsageChartsCard';
import CostBreakdownCard from './voice-analytics/CostBreakdownCard';
import RealtimeSessionsList from './voice-analytics/RealtimeSessionsList';

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
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await voiceManagementService.getRealtimeSessions();
        setSessions(response.sessions ?? response.data?.sessions ?? []);
      } catch (error: any) {
        logger.error('Failed to load sessions', 'VoiceAnalyticsPanel', error);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView>
      <View style={styles.container}>
        <LatencyMetricsCard />
        <UsageChartsCard />
        <CostBreakdownCard />
        <RealtimeSessionsList sessions={sessions} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
});
