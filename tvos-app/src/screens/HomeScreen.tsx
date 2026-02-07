/**
 * HomeScreen - Main TV home screen with content shelves
 * Content shelves, hero carousel, voice integration, and multi-window support
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@bayit/shared-stores';
import { ContentShelf, ContentItem } from '../components/ContentShelf';
import { HeroCarouselTV, HeroItem } from '../components/HeroCarouselTV';
import { IsraelisInCityShelf } from '../components/IsraelisInCityShelf';
import { HeroCarouselSkeleton } from '../components/skeletons/HeroCarouselSkeleton';
import { ContentShelfSkeleton } from '../components/skeletons/ContentShelfSkeleton';
import { TVHeader } from '../components/TVHeader';
import { MultiWindowManager } from '../components/windows/MultiWindowManager';
import { useLocationTV } from '../hooks/useLocationTV';
import { useHomeData } from '../hooks/useHomeData';
import { CreditBalanceWidget } from '../components/beta';
import { styles } from './styles/HomeScreen.styles';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { location, isDetecting } = useLocationTV();
  const {
    featuredData, featuredLoading, trendingData, trendingLoading,
    channelsData, channelsLoading, vodData, vodLoading,
    radioData, radioLoading, podcastsData, podcastsLoading,
    continueWatchingData,
  } = useHomeData();

  const handleItemSelect = (item: ContentItem) => {
    switch (item.type) {
      case 'live_channel': navigation.navigate('LiveTV', { channelId: item.id }); break;
      case 'vod': navigation.navigate('Player', { vodId: item.id }); break;
      case 'radio': navigation.navigate('Radio', { stationId: item.id }); break;
      case 'podcast': navigation.navigate('Podcasts', { podcastId: item.id }); break;
      default: navigation.navigate('Player', { contentId: item.id });
    }
  };

  const handleHeroSelect = (item: HeroItem) => {
    navigation.navigate('Player', { contentId: item.id });
  };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="home" navigation={navigation} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {featuredLoading ? (
          <HeroCarouselSkeleton />
        ) : (
          featuredData?.spotlight?.length > 0 && (
            <HeroCarouselTV items={featuredData.spotlight} onItemSelect={handleHeroSelect} testID="hero-carousel" />
          )
        )}

        {user && <CreditBalanceWidget />}

        {user && continueWatchingData?.length > 0 && (
          <ContentShelf title={t('tvos.home.continueWatching', 'Continue Watching')} items={continueWatchingData} onItemSelect={handleItemSelect} testID="continue-watching-shelf" />
        )}

        <IsraelisInCityShelf location={location} isDetecting={isDetecting} onItemSelect={handleItemSelect} />

        {trendingLoading ? <ContentShelfSkeleton /> : (
          trendingData?.length > 0 && (
            <ContentShelf title={t('tvos.home.trendingNow', 'Trending Now')} items={trendingData} onItemSelect={handleItemSelect} testID="trending-shelf" />
          )
        )}

        {channelsLoading ? <ContentShelfSkeleton /> : (
          channelsData?.length > 0 && (
            <ContentShelf title={t('tvos.home.liveTV', 'Live TV')} items={channelsData} onItemSelect={handleItemSelect} onSeeAll={() => navigation.navigate('LiveTV')} testID="live-tv-shelf" />
          )
        )}

        {vodLoading ? <ContentShelfSkeleton /> : (
          vodData?.length > 0 && (
            <ContentShelf title={t('tvos.home.moviesAndSeries', 'Movies & Series')} items={vodData} onItemSelect={handleItemSelect} onSeeAll={() => navigation.navigate('VOD')} testID="vod-shelf" />
          )
        )}

        {radioLoading ? <ContentShelfSkeleton /> : (
          radioData?.length > 0 && (
            <ContentShelf title={t('tvos.home.radioStations', 'Radio Stations')} items={radioData} onItemSelect={handleItemSelect} onSeeAll={() => navigation.navigate('Radio')} testID="radio-shelf" />
          )
        )}

        {podcastsLoading ? <ContentShelfSkeleton /> : (
          podcastsData?.length > 0 && (
            <ContentShelf title={t('tvos.home.podcasts', 'Podcasts')} items={podcastsData} onItemSelect={handleItemSelect} onSeeAll={() => navigation.navigate('Podcasts')} testID="podcasts-shelf" />
          )
        )}
      </ScrollView>

      <MultiWindowManager currentPage="home" />
    </View>
  );
};
