/**
 * Save Button Component
 * Save button with loading and success states
 */

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { colors } from '@bayit/shared/theme';
import { SaveButtonProps } from '../types';

export function SaveButton({ onSave, saving, saved, isRTL }: SaveButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onSave}
      disabled={saving || saved}
      className="py-4 px-6 rounded-lg items-center justify-center"
      style={saved ? styles.savedBackground : styles.defaultBackground}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.background} />
      ) : saved ? (
        <View className="flex-row items-center gap-2" style={isRTL && styles.rowReverse}>
          <Check size={20} color="#22C55E" />
          <Text className="text-[16px] font-semibold text-green-500">
            {t('common.saved', 'נשמר!')}
          </Text>
        </View>
      ) : (
        <Text className="text-[16px] font-semibold text-white">
          {t('common.save')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  defaultBackground: {
    backgroundColor: 'rgb(147, 51, 234)', // purple-600
  },
  savedBackground: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // green-500/20
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
