import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { isDemo } from '../config/appConfig';

/**
 * DemoBanner Component
 * Displays a banner indicating the app is running in demo mode.
 * Only renders when isDemo is true (development mode).
 */
export const DemoBanner: React.FC = () => {
  const { t } = useTranslation();
  const { flexDirection, textAlign } = useDirection();

  if (!isDemo) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center bg-orange-500/90 py-1.5 px-4 gap-2 z-[1000]" style={{ flexDirection }}>
      <Text className="text-sm">🎭</Text>
      <Text className="text-xs font-bold text-black tracking-wider" style={{ textAlign }}>{t('demo.banner')}</Text>
      <Text className="text-xs text-gray-800" style={{ textAlign }}>{t('demo.bannerSubtext')}</Text>
    </View>
  );
};

export default DemoBanner;
