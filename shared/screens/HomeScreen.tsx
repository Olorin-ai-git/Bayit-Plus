import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { ContentRow } from '../components/ContentRow';
import { GlassCarousel } from '../components/GlassCarousel';
import { TrendingRow } from '../components/TrendingRow';
import { JerusalemRow } from '../components/JerusalemRow';
import { TelAvivRow } from '../components/TelAvivRow';
import { GlassLiveChannelCard } from '../components/ui/GlassLiveChannelCard';
import { contentService, liveService, historyService, ritualService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { formatContentMetadata } from '../utils/metadataFormatters';
import { useDirection } from '../hooks/useDirection';
import { isTV } from '../utils/platform';
import { useHomePageConfigStore } from '../stores/homePageConfigStore';
import type { HomeSectionId } from '../types/homePageConfig';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
}

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
}

// Channel interface for live TV
interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
}

export const HomeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();
  const { getVisibleSections, loadPreferences } = useHomePageConfigStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<{ name: string; items: ContentItem[] }[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  const currentLang = i18n.language;
  const isHebrew = currentLang === 'he';

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

  // Helper to get localized title (uses centralized utility)
  const getLocalizedTitle = (item: any) => {
    return getLocalizedName(item, currentLang);
  };

  // Helper to get localized description (uses centralized utility)
  const getLocalizedDesc = (item: any) => {
    return getLocalizedDescription(item, currentLang);
  };

  // Helper to get any localized field
  const getLocalizedField = (item: any, field: string) => {
    if (currentLang === 'he') {
      return item[field];
    }
    if (currentLang === 'es') {
      return item[`${field}_es`] || item[`${field}_en`] || item[field];
    }
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    checkMorningRitual();
    loadContent();
    loadPreferences();
  }, [i18n.language, loadPreferences]);

  const checkMorningRitual = async () => {
    // Skip ritual check if not authenticated - requires user preferences
    if (!isAuthenticated) return;

    try {
      const result = await ritualService.shouldShow() as { show_ritual: boolean };
      if (result.show_ritual) {
        navigation.navigate('MorningRitual' as never);
      }
    } catch (err) {
      // Ritual not enabled or error - continue to home
      console.log('Morning ritual check:', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);

      // Build request array - only include authenticated endpoints when logged in
      const requests: Promise<any>[] = [
        contentService.getFeatured(),
        liveService.getChannels(),
        contentService.getCategories(),
      ];

      // Only fetch history if authenticated (requires user token)
      if (isAuthenticated) {
        requests.push(historyService.getContinueWatching());
      }

      // Load all content in parallel using allSettled to handle individual failures gracefully
      const results = await Promise.allSettled(requests);

      // Extract successful results, using empty defaults for failed calls
      const featuredRes = results[0].status === 'fulfilled' ? results[0].value : { hero: null, spotlight: [], items: [] };
      const liveRes = results[1].status === 'fulfilled' ? results[1].value : { channels: [] };
      const categoriesRes = results[2].status === 'fulfilled' ? results[2].value : { categories: [] };
      const historyRes = isAuthenticated && results[3]?.status === 'fulfilled' ? results[3].value : { items: [] };

      // Log any failed requests for debugging
      const endpoints = isAuthenticated ? ['featured', 'channels', 'categories', 'history'] : ['featured', 'channels', 'categories'];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.log(`[HomeScreen] ${endpoints[index]} request failed:`, result.reason?.message || result.reason);
        }
      });

      // Set carousel from featured hero items
      const heroItems = featuredRes.hero ? [featuredRes.hero] : [];
      const spotlightItems = featuredRes.spotlight || [];
      setCarouselItems([...heroItems, ...spotlightItems].map((item: any, index: number) => ({
        id: item.id,
        title: getLocalizedTitle(item),
        subtitle: formatContentMetadata(item),
        description: getLocalizedDescription(item),
        image: item.backdrop || item.thumbnail,
        badge: index === 0 ? t('common.new') : undefined,
      })));

      // Set featured content
      setFeatured((featuredRes.items || featuredRes.picks || []).map((item: any) => ({
        ...item,
        title: getLocalizedTitle(item),
      })));

      // Set live channels (use Channel interface for GlassLiveChannelCard)
      setLiveChannels((liveRes.channels || []).map((ch: any) => ({
        id: ch.id,
        name: getLocalizedTitle(ch),
        thumbnail: ch.thumbnail,
        logo: ch.logo,
        currentShow: getLocalizedField(ch, 'current_program') || t('home.liveNow'),
      })));

      // Set continue watching from history (may be empty if not authenticated)
      setContinueWatching((historyRes.items || []).map((item: any) => ({
        id: item.id,
        title: getLocalizedTitle(item),
        subtitle: item.remaining || getLocalizedField(item, 'episode') || '',
        thumbnail: item.thumbnail,
        type: item.type,
      })));

      // Set categories
      setCategories((categoriesRes.categories || []).map((cat: any) => ({
        name: cat.id || cat.name,
        items: (cat.items || []).map((item: any) => ({
          id: item.id,
          title: getLocalizedTitle(item),
          thumbnail: item.thumbnail,
          type: item.type,
        })),
      })));

    } catch (error) {
      console.error('Failed to load content:', error);
      // In production, show error state instead of silent failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: ContentItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.type || 'vod',
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

  const handleCarouselPress = (item: CarouselItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: item.badge === 'LIVE' ? 'live' : 'vod',
    });
  };

  // Handle live channel press
  const handleLiveChannelPress = (channel: Channel) => {
    navigation.navigate('Player', {
      id: channel.id,
      title: channel.name,
      type: 'live',
    });
  };

  // Render section based on ID
  const renderSection = (sectionId: HomeSectionId): React.ReactNode => {
    switch (sectionId) {
      case 'continue_watching':
        return continueWatching.length > 0 ? (
          <ContentRow
            key="continue_watching"
            title={t('home.continueWatching')}
            items={continueWatching}
            onItemPress={handleItemPress}
          />
        ) : null;

      case 'live_tv':
        return liveChannels.length > 0 ? (
          <View key="live_tv" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
            <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <View className={`flex-row items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <View className="flex-row items-center bg-red-600 px-2 py-1 rounded gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-white" />
                  <Text className={`${isTV ? 'text-xs' : 'text-[10px]'} font-bold text-white`}>{t('common.live')}</Text>
                </View>
                <Text className={`${isTV ? 'text-[28px]' : 'text-xl'} font-bold text-white ${isRTL ? 'text-right' : ''}`}>{t('home.liveTV')}</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('LiveTV')}
                className={({ focused }: any) => `px-2 py-1 rounded-sm border-2 ${focused ? 'border-purple-600 bg-purple-600/20' : 'border-transparent'}`}
              >
                <Text className={`${isTV ? 'text-lg' : 'text-sm'} text-purple-500 font-medium`}>{t('home.allChannels')}</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: isTV ? 16 : 12, paddingRight: 16 }}
              className={isRTL ? 'flex-row-reverse' : ''}
            >
              {liveChannels.slice(0, 8).map((channel) => (
                <View key={channel.id} className={isTV ? 'w-80' : 'w-60'}>
                  <GlassLiveChannelCard
                    channel={channel}
                    liveLabel={t('common.live')}
                    onPress={() => handleLiveChannelPress(channel)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null;

      case 'trending':
        return (
          <View key="trending" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
            <TrendingRow
              onTopicPress={(topic) => {
                const lang = i18n.language;
                const localizedTitle = lang === 'he'
                  ? topic.title
                  : lang === 'es'
                    ? (topic.title_es || topic.title_en || topic.title)
                    : (topic.title_en || topic.title);
                navigation.navigate('Search', { query: localizedTitle });
              }}
            />
          </View>
        );

      case 'jerusalem':
        return (
          <View key="jerusalem" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
            <JerusalemRow />
          </View>
        );

      case 'tel_aviv':
        return (
          <View key="tel_aviv" className={`${isTV ? 'mt-12' : 'mt-8'} ${isTV ? 'px-8' : 'px-4'}`}>
            <TelAvivRow />
          </View>
        );

      case 'featured':
        return featured.length > 0 ? (
          <ContentRow
            key="featured"
            title={t('home.featuredContent')}
            items={featured}
            onItemPress={handleItemPress}
          />
        ) : null;

      case 'categories':
        return (
          <React.Fragment key="categories">
            {categories.map((category) => (
              category.items.length > 0 && (
                <ContentRow
                  key={category.name}
                  title={t(`home.${category.name}`, category.name)}
                  items={category.items}
                  onItemPress={handleItemPress}
                />
              )
            ))}
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  // Get visible sections sorted by order
  const visibleSections = getVisibleSections();

  return (
    <ScrollView className="flex-1 bg-[#0a0a14]" contentContainerStyle={{ paddingBottom: isTV ? 64 : 32 }}>
      {/* Header Bar - Digital Clocks (matching web design) */}
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

      {/* Hero Carousel - Always visible, always first */}
      <View className={`${isTV ? 'px-8' : 'px-4'} ${isTV ? 'pt-4' : 'pt-2'} ${isTV ? 'mb-8' : 'mb-6'}`}>
        <GlassCarousel
          items={carouselItems}
          onItemPress={handleCarouselPress}
          height={isTV ? 700 : 400}
          autoPlayInterval={6000}
        />
      </View>

      {/* Dynamic Sections - Rendered based on user configuration */}
      {visibleSections.map((section) => renderSection(section.id))}
    </ScrollView>
  );
};

export default HomeScreen;
