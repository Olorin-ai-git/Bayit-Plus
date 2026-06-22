import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { isTV } from '../utils/platform';

export const HomeHeader: React.FC = () => {
  const { i18n } = useTranslation();
  const { isRTL } = useDirection();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Format time for display
  const formatTime = (date: Date, timeZone?: string) => {
    return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
  };

  const israelTime = formatTime(currentTime, 'Asia/Jerusalem');
  const localTime = formatTime(currentTime);

  return (
    <View className={`flex-row justify-between items-center ${isTV ? 'px-8' : 'px-4'} pt-4 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Dual Clock Display */}
      <View className={`flex-row items-center bg-[#0a0a14cc] ${isTV ? 'px-6' : 'px-4'} ${isTV ? 'py-2' : 'py-1'} ${isTV ? 'rounded-2xl' : 'rounded-xl'} border border-purple-600/30 ${isTV ? 'gap-4' : 'gap-2'} ${isRTL ? 'flex-row-reverse' : ''}`}>
        <View className={`flex-row items-center ${isTV ? 'gap-2' : 'gap-1'}`}>
          <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>🇮🇱</Text>
          <Text className={`${isTV ? 'text-[28px]' : 'text-xl'} font-bold text-white`}>{israelTime}</Text>
        </View>
        <View className={`w-px ${isTV ? 'h-10' : 'h-8'} bg-white/20`} />
        <View className={`flex-row items-center ${isTV ? 'gap-2' : 'gap-1'}`}>
          <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>🇺🇸</Text>
          <Text className={`${isTV ? 'text-[28px]' : 'text-xl'} font-bold text-white`}>{localTime}</Text>
        </View>
      </View>
    </View>
  );
};
