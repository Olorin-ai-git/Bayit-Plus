/**
 * Enable Toggle Card Component
 * Main card for enabling/disabling ritual feature
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { spacing, colors } from '@bayit/shared/theme';
import { Toggle } from './Toggle';
import { EnableToggleCardProps } from '../types';

export function EnableToggleCard({ enabled, onToggle, isRTL }: EnableToggleCardProps) {
  const { t } = useTranslation();

  return (
    <GlassView style={styles.container}>
      <Pressable
        onPress={onToggle}
        style={[styles.pressable, isRTL && styles.rowReverse]}
      >
        <Text style={[styles.label, isRTL && styles.textRight]}>
          {t('settings.ritual.enabled')}
        </Text>
        <Toggle value={enabled} onToggle={onToggle} />
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  textRight: {
    textAlign: 'right',
  },
});
