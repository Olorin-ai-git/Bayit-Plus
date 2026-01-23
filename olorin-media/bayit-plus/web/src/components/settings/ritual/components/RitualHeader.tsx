/**
 * Ritual Header Component
 * Header section with icon, title, and description
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sunrise } from 'lucide-react';
import { RitualHeaderProps } from '../types';

export function RitualHeader({ isRTL }: RitualHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-4 mb-2" style={isRTL && styles.rowReverse}>
      <View className="w-12 h-12 rounded-md bg-amber-500/20 justify-center items-center">
        <Sunrise size={24} color="#F59E0B" />
      </View>
      <View className="flex-1">
        <Text className="text-[20px] font-bold text-white" style={isRTL && styles.textRight}>
          {t('settings.ritual.title')}
        </Text>
        <Text className="text-[14px] text-gray-400 mt-0.5" style={isRTL && styles.textRight}>
          {t('settings.ritual.description', 'הגדר את חוויית הבוקר המותאמת אישית שלך')}
        </Text>
      </View>
    </View>
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
