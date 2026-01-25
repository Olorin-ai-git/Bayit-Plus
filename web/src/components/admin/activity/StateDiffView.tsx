import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

interface StateDiff {
  key: string;
  before: any;
  after: any;
}

interface StateDiffViewProps {
  diffs: StateDiff[];
  textAlign: 'left' | 'right';
}

export const StateDiffView: React.FC<StateDiffViewProps> = ({ diffs, textAlign }) => {
  const { t } = useTranslation();

  if (diffs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t('admin.librarian.activityLog.changes')}:
      </Text>
      {diffs.map((diff, idx) => (
        <View key={idx} style={styles.diffItem}>
          <Text style={styles.keyText}>{diff.key}:</Text>
          <View style={styles.valueRow}>
            <Text style={styles.beforeText}>
              {typeof diff.before === 'object' ? JSON.stringify(diff.before) : String(diff.before || 'null')}
            </Text>
            <Text style={styles.arrowText}>→</Text>
            <Text style={styles.afterText}>
              {typeof diff.after === 'object' ? JSON.stringify(diff.after) : String(diff.after || 'null')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 8,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.textSecondary,
  },
  diffItem: {
    marginBottom: 4,
  },
  keyText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.primary.DEFAULT,
  },
  valueRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  beforeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    textDecorationLine: 'line-through',
    color: colors.error.DEFAULT,
  },
  arrowText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  afterText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.success.DEFAULT,
  },
});

export default StateDiffView;
