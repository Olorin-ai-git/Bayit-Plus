import React, { useEffect } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { GlassCarousel } from '../components/GlassCarousel';
import { HomeHeader } from '../components/HomeHeader';
import { HomeSectionRenderer } from '../components/HomeSectionRenderer';
import { ritualService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useHomePageConfigStore } from '../stores/homePageConfigStore';
import { useHomeContent, ContentItem, CarouselItem, Channel } from '../hooks/useHomeContent';
import { isTV } from '../utils/platform';

export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { getVisibleSections, loadPreferences } = useHomePageConfigStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    isLoading,
    carouselItems,
    continueWatching,
    featured,
    liveChannels,
    categories,
  } = useHomeContent(isAuthenticated);

  useEffect(() => {
    checkMorningRitual();
    loadPreferences();
  }, [loadPreferences]);

  const checkMorningRitual = async () => {
    // Skip ritual check if not authenticated
    if (!isAuthenticated) return;

    try {
      const result = await ritualService.shouldShow() as { show_ritual: boolean };
      if (result.show_ritual) {
        navigation.navigate('MorningRitual' as never);
      }
    } catch (err) {
      // Ritual not enabled or error - continue to home
    }
  };

  const handleItemPress = (item: ContentItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.type || 'vod',
    });
  };

  const handleCarouselPress = (item: CarouselItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.badge === 'LIVE' ? 'live' : 'vod',
    });
  };

  const handleLiveChannelPress = (channel: Channel) => {
    navigation.navigate('Player', {
      id: channel.id,
      title: channel.name,
      type: 'live',
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0a0a14] justify-center items-center">
        <AnimatedLogo size="large" />
        <Text className={`text-white ${isTV ? 'text-lg' : 'text-base'} mt-8`}>{t('home.loadingContent')}</Text>
      </View>
    );
  }

  const visibleSections = getVisibleSections();

  return (
    <ScrollView className="flex-1 bg-[#0a0a14]" contentContainerStyle={{ paddingBottom: isTV ? 64 : 32 }}>
      <HomeHeader />

      {/* Hero Carousel */}
      <View className={`${isTV ? 'px-8' : 'px-4'} ${isTV ? 'pt-4' : 'pt-2'} ${isTV ? 'mb-8' : 'mb-6'}`}>
        <GlassCarousel
          items={carouselItems}
          onItemPress={handleCarouselPress}
          height={isTV ? 700 : 400}
          autoPlayInterval={6000}
        />
      </View>

      {/* Dynamic Sections */}
      {visibleSections.map((section) => (
        <HomeSectionRenderer
          key={section.id}
          sectionId={section.id}
          continueWatching={continueWatching}
          featured={featured}
          liveChannels={liveChannels}
          categories={categories}
          onItemPress={handleItemPress}
          onLiveChannelPress={handleLiveChannelPress}
        />
      ))}
    </ScrollView>
  );
};

export default HomeScreen;
