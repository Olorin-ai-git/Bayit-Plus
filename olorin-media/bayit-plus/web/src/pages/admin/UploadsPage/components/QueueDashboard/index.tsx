/**
 * QueueDashboard Component
 * Wrapper around GlassQueue for upload queue visualization
 * Reuses existing GlassQueue component for consistency
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import GlassQueue from '@/components/admin/GlassQueue';
import type { QueueState } from '../../types';

interface QueueDashboardProps {
  queueState: QueueState;
  onRefresh: () => void;
}

export const QueueDashboard: React.FC<QueueDashboardProps> = ({ queueState, onRefresh }) => {
  return (
    <View style={styles.container}>
      <GlassQueue
        stats={queueState.stats}
        activeJob={queueState.activeJob}
        queuedJobs={queueState.queuedJobs}
        recentCompleted={queueState.recentCompleted}
        queuePaused={queueState.queuePaused}
        pauseReason={queueState.pauseReason}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
