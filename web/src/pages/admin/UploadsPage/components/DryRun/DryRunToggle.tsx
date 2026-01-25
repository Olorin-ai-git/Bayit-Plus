/**
 * DryRunToggle Component
 * Toggle switch to enable/disable dry run mode
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassToggle } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';

interface DryRunToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const DryRunToggle: React.FC<DryRunToggleProps> = ({ enabled, onChange }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <GlassToggle value={enabled} onValueChange={onChange} />
      <View style={styles.textContainer}>
        <Text style={styles.label}>{t('admin.uploads.dryRun.toggle')}</Text>
        <Text style={styles.description}>{t('admin.uploads.dryRun.enabled')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
