/**
 * StageTooltip Component
 * Displays detailed information about an upload stage
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { UPLOAD_STAGES } from '../constants';
import { getStageDescription, getEstimatedTime } from '../utils';

interface StageTooltipProps {
  stage: typeof UPLOAD_STAGES[number];
  status: string;
  fileSize?: number;
  visible: boolean;
}

export const StageTooltip: React.FC<StageTooltipProps> = ({ stage, status, fileSize, visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{stage.label}</Text>
      <Text style={styles.description}>
        {getStageDescription(stage.key)}
      </Text>
      <Text style={styles.estimate}>
        Estimated: {getEstimatedTime(stage.key, fileSize)}
      </Text>
      <Text style={styles.status}>
        Status: {status || 'pending'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  estimate: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  status: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
