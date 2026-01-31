import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared/hooks';
import { GlassCard, GlassView } from '../components';

export function NotFoundScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  const handleGoSearch = () => {
    navigation.navigate('Search');
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-[#0f0f1e] px-8">
      <GlassCard className="p-9 items-center max-w-[600px] w-full">
        {/* Error Icon */}
        <View className="w-[100px] h-[100px] rounded-[50px] bg-primary/30 justify-center items-center mb-5">
          <NativeIcon name="search" size="xxxl" context="tv" color="#8a2be2" />
        </View>

        {/* Error Code */}
        <Text className="text-[80px] font-bold text-primary mb-2">404</Text>

        {/* Title */}
        <Text className="text-[28px] font-semibold text-white mb-4 text-center">
          {t('notFound.title', 'הדף לא נמצא')}
        </Text>

        {/* Description */}
        <Text className="text-lg text-gray-400 mb-8 text-center leading-[26px]">
          {t('notFound.description', 'הדף שחיפשת לא קיים או הועבר למקום אחר.')}
        </Text>

        {/* Navigation Buttons */}
        <View className="flex-row flex-wrap justify-center gap-4 mb-8">
          <Pressable
            onPress={handleGoHome}
            className={({ focused }) => `
              flex-row items-center px-5 py-3 rounded-full gap-2
              border-[3px] ${focused ? 'border-white scale-105' : 'border-transparent'}
              bg-primary min-w-[140px] justify-center
            `}
          >
            <NativeIcon name="home" size="lg" context="tv" color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">
              {t('notFound.goHome', 'לדף הבית')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGoSearch}
            className={({ focused }) => `
              flex-row items-center px-5 py-3 rounded-full gap-2
              border-[3px] ${focused ? 'border-white scale-105' : 'border-transparent'}
              bg-secondary min-w-[140px] justify-center
            `}
          >
            <NativeIcon name="search" size="lg" context="tv" color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">
              {t('notFound.search', 'חיפוש')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGoBack}
            className={({ focused }) => `
              flex-row items-center px-5 py-3 rounded-full gap-2
              border-[3px] ${focused ? 'border-white scale-105' : 'border-transparent'}
              bg-white/10 min-w-[140px] justify-center
            `}
          >
            <NativeIcon name="chevronLeft" size="lg" context="tv" color="#9ca3af" />
            <Text className="text-base font-semibold text-gray-400">
              {t('notFound.goBack', 'חזור')}
            </Text>
          </Pressable>
        </View>

        {/* Suggestions */}
        <View className="items-center pt-5 border-t border-white/10 w-full">
          <Text className="text-sm text-gray-500 mb-4">
            {t('notFound.suggestions', 'אולי תרצה לנסות:')}
          </Text>
          <View className="flex-row flex-wrap justify-center gap-4">
            <Pressable
              onPress={() => navigation.navigate('VOD')}
              className={({ focused }) => `
                px-4 py-2 bg-white/5 rounded-full border-2
                ${focused ? 'border-primary bg-primary/30' : 'border-transparent'}
              `}
            >
              <Text className="text-sm text-gray-400">
                {t('nav.vod', 'סרטים וסדרות')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('LiveTV')}
              className={({ focused }) => `
                px-4 py-2 bg-white/5 rounded-full border-2
                ${focused ? 'border-primary bg-primary/30' : 'border-transparent'}
              `}
            >
              <Text className="text-sm text-gray-400">
                {t('nav.live', 'שידור חי')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Radio')}
              className={({ focused }) => `
                px-4 py-2 bg-white/5 rounded-full border-2
                ${focused ? 'border-primary bg-primary/30' : 'border-transparent'}
              `}
            >
              <Text className="text-sm text-gray-400">
                {t('nav.radio', 'רדיו')}
              </Text>
            </Pressable>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

export default NotFoundScreen;
