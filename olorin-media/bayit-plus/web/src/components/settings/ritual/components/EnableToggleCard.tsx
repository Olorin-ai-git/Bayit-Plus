/**
 * Enable Toggle Card Component
 * Main card for enabling/disabling ritual feature
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared/ui';
import { Toggle } from './Toggle';
import { EnableToggleCardProps } from '../types';

export function EnableToggleCard({ enabled, onToggle, isRTL }: EnableToggleCardProps) {
  const { t } = useTranslation();

  return (
    <GlassView className="p-4">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between"
        style={isRTL && styles.rowReverse}
      >
        <Text className="text-[15px] font-medium text-white" style={isRTL && styles.textRight}>
          {t('settings.ritual.enabled')}
        </Text>
        <Toggle value={enabled} onToggle={onToggle} />
      </Pressable>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
});
