/**
 * StageError Component
 * Displays error information for failed upload stages
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { QueueJob } from '../types';

interface StageErrorProps {
  job: QueueJob;
}

export const StageError: React.FC<StageErrorProps> = ({ job }) => {
  const failedStages = Object.entries(job.stages || {})
    .filter(([_, status]) => status === 'failed')
    .map(([key, _]) => key);

  if (failedStages.length === 0 || !job.error_message) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertCircle size={14} color={colors.error} />
        <Text style={styles.headerText}>
          Failed at: {failedStages.join(', ')}
        </Text>
      </View>
      <Text style={styles.errorDetail}>
        {job.error_message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    marginLeft: spacing.xs,
  },
  errorDetail: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
