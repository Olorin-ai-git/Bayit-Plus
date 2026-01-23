/**
 * StageError Component
 * Displays error information for failed upload stages
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
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
    <View style={[styles.container, { backgroundColor: colors.error + '10', borderLeftColor: colors.error }]}>
      <View style={styles.headerRow}>
        <AlertCircle size={14} color={colors.error} />
        <Text style={[styles.headerText, { color: colors.error }]}>
          Failed at: {failedStages.join(', ')}
        </Text>
      </View>
      <Text style={[styles.errorText, { color: colors.textMuted }]}>
        {job.error_message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
