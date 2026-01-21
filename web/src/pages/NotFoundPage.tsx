import { View, Text, Pressable } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Home, Search, ArrowRight } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassCard, GlassView } from '@bayit/shared/ui';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  return (
    <View className="flex-1 min-h-screen justify-center items-center relative px-6 py-16">
      {/* Decorative blur circles */}
      <View className="absolute w-[400px] h-[400px] top-[10%] right-[10%] rounded-full bg-purple-600 opacity-15 blur-[120px]" />
      <View className="absolute w-[300px] h-[300px] bottom-[20%] left-[5%] rounded-full bg-violet-600 opacity-12 blur-[120px]" />
      <View className="absolute w-[250px] h-[250px] top-[40%] left-[30%] rounded-full bg-purple-500 opacity-[0.08] blur-[120px]" />

      <View className="items-center z-10 max-w-[480px] w-full">
        {/* Large 404 text */}
        <Text className="text-[140px] font-extrabold text-purple-600 mb-6 tracking-[-4px]" style={{ textShadow: `0 0 60px ${colors.primary}40` }}>404</Text>

        {/* Glass card with message */}
        <GlassView className="p-12 items-center w-full rounded-2xl">
          <View className="w-20 h-20 rounded-full bg-purple-600/30 justify-center items-center mb-6">
            <Text className="text-5xl">🏠</Text>
          </View>

          <Text className="text-3xl font-bold text-white mb-2 text-center">{t('notFound.title')}</Text>
          <Text className="text-base text-white/70 mb-8 text-center leading-6">
            {t('notFound.description')}
          </Text>

          <View className="flex-row gap-4 w-full">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 bg-purple-600 py-4 px-6 rounded-lg"
              onPress={() => navigate('/')}
            >
              <Home size={20} color={colors.background} />
              <Text className="text-base font-semibold text-black">{t('notFound.homeButton')}</Text>
            </Pressable>

            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 bg-white/10 border border-white/20 py-4 px-6 rounded-lg"
              onPress={() => navigate('/search')}
            >
              <Search size={20} color={colors.text} />
              <Text className="text-base font-semibold text-white">{t('notFound.searchButton')}</Text>
            </Pressable>
          </View>
        </GlassView>

        {/* Quick links */}
        <View className="mt-12 items-center">
          <Text className="text-sm text-white/60 mb-4">{t('notFound.orTry')}</Text>
          <View className="flex-row gap-6 flex-wrap justify-center">
            <Pressable className="flex-row items-center gap-1 py-2 px-4 rounded-full bg-white/5" onPress={() => navigate('/live')}>
              <Text className="text-sm text-purple-600 font-medium">{t('notFound.liveChannel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
            <Pressable className="flex-row items-center gap-1 py-2 px-4 rounded-full bg-white/5" onPress={() => navigate('/vod')}>
              <Text className="text-sm text-purple-600 font-medium">{t('notFound.vodLabel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
            <Pressable className="flex-row items-center gap-1 py-2 px-4 rounded-full bg-white/5" onPress={() => navigate('/podcasts')}>
              <Text className="text-sm text-purple-600 font-medium">{t('notFound.podcastsLabel')}</Text>
              <ArrowRight size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
