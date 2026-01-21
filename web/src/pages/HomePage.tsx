import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import AnimatedCard from '@/components/common/AnimatedCard';
import {
  TrendingRow,
  JerusalemRow,
  TelAvivRow,
  GlassCarousel,
  CultureCityRow,
  CultureClock,
  CultureTrendingRow,
} from '@bayit/shared';
import { useCultureStore } from '@bayit/shared-contexts/CultureContext';
import { GlassLiveChannelCard, GlassCheckbox } from '@bayit/shared/ui';
import MorningRitual from '@/components/ritual/MorningRitual';
import { contentService, liveService, historyService, ritualService } from '@/services/api';
import { ShabbatModeBanner, ShabbatEveSection } from '@/components/judaism';
import { colors, spacing } from '@bayit/shared/theme';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils/contentLocalization';
import { formatContentMetadata } from '@bayit/shared-utils/metadataFormatters';
import { getContentPosterUrl } from '@bayit/shared-utils/youtube';
import logger from '@/utils/logger';

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
  is_series?: boolean;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
}

interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
  category_name_en?: string;
  category_name_es?: string;
  is_series?: boolean;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
  backdrop?: string;
  description?: string;
  total_episodes?: number;
  progress?: number;
}

interface Category {
  id: string;
  name: string;
  name_he?: string;
  name_en?: string;
  name_es?: string;
  items: ContentItem[];
}

// Section skeleton component for individual sections
function SectionSkeleton() {
  const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

  return (
    <View className={`mt-8 ${IS_TV_BUILD ? 'px-8' : 'px-4'}`}>
      <View className="w-36 h-7 bg-white/5 rounded-lg mb-4" />
      <View className="flex flex-row gap-4">
        {[1, 2, 3, 4, 5].map((j) => (
          <View
            key={j}
            className={`${IS_TV_BUILD ? 'w-70' : 'w-50'} aspect-video bg-white/[0.03] rounded-xl`}
          />
        ))}
      </View>
    </View>
  );
}

// Hero skeleton with Avatar placeholder
function HeroSkeleton() {
  const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;
  const placeholderImage = 'https://image.tmdb.org/t/p/original/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg';

  return (
    <View className={`${IS_TV_BUILD ? 'h-[550px]' : 'h-[600px]'} bg-white/[0.03] relative overflow-hidden rounded-2xl`}>
      <img
        src={placeholderImage}
        alt="Loading..."
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-black/30 via-black/60 to-black/95" />
      <View className={`absolute ${IS_TV_BUILD ? 'bottom-30 left-16' : 'bottom-20 left-6'} flex flex-row items-center gap-4`}>
        <div className="loading-spinner" style={{
          width: IS_TV_BUILD ? 32 : 24,
          height: IS_TV_BUILD ? 32 : 24,
          borderRadius: '50%',
          border: '3px solid rgba(107, 33, 168, 0.3)',
          borderTopColor: '#7e22ce',
        }} />
        <Text className={`${IS_TV_BUILD ? 'text-2xl' : 'text-xl'} font-semibold text-white drop-shadow-lg`}>Loading...</Text>
      </View>
    </View>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();

  // Culture store for dynamic culture-based content
  const {
    currentCulture,
    cultureCities,
    fetchCultures,
    isLoading: cultureLoading,
  } = useCultureStore();

  // Guard against React StrictMode double-invocation
  const hasInitialized = useRef(false);

  // Independent loading states for each section
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [continueLoading, setContinueLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false);

  // Load content on mount - each section loads independently
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    checkMorningRitual();

    // Launch all fetches independently - they don't block each other
    loadFeaturedContent();
    loadLiveChannels();
    loadContinueWatching();

    // Fetch cultures for dynamic content
    fetchCultures();
  }, []);

  const checkMorningRitual = async () => {
    try {
      const result = await ritualService.shouldShow();
      if (result.show_ritual) setShowMorningRitual(true);
    } catch (err) {
      logger.debug('Morning ritual check failed', 'HomePage', err);
    }
  };

  // Load featured content (hero carousel + categories)
  const loadFeaturedContent = async () => {
    try {
      const featuredData = await contentService.getFeatured();

      // Build carousel items from spotlight data
      const spotlightItems = featuredData.spotlight || [];
      setCarouselItems(spotlightItems.map((item: any, index: number) => ({
        id: item.id,
        title: getLocalizedName(item, i18n.language),
        subtitle: formatContentMetadata(item),
        description: getLocalizedDescription(item, i18n.language),
        image: getContentPosterUrl(item) || item.backdrop || item.thumbnail,
        badge: index === 0 ? t('common.new') : undefined,
        is_series: item.is_series,
        available_subtitle_languages: item.available_subtitle_languages,
        has_subtitles: item.has_subtitles,
      })));
      setCarouselLoading(false);

      // Categories from featured data
      setCategories(featuredData.categories || []);
      setCategoriesLoading(false);
    } catch (error) {
      logger.error('Failed to load featured content', 'HomePage', error);
      setCarouselLoading(false);
      setCategoriesLoading(false);
    }
  };

  // Load live channels independently
  const loadLiveChannels = async () => {
    try {
      const liveData = await liveService.getChannels();
      setLiveChannels(liveData.channels || []);
    } catch (error) {
      logger.error('Failed to load live channels', 'HomePage', error);
    } finally {
      setLiveLoading(false);
    }
  };

  // Load continue watching independently
  const loadContinueWatching = async () => {
    try {
      const continueData = await historyService.getContinueWatching();
      setContinueWatching(continueData.items || []);
    } catch (error) {
      logger.error('Failed to load continue watching', 'HomePage', error);
    } finally {
      setContinueLoading(false);
    }
  };

  const syncContent = async () => {
    try {
      setSyncing(true);
      logger.info('Syncing home content...', 'HomePage');
      await contentService.syncContent();

      // Reload all sections
      loadFeaturedContent();
      loadLiveChannels();
      loadContinueWatching();
    } catch (error) {
      logger.error('Failed to sync content', 'HomePage', error);
    } finally {
      setSyncing(false);
    }
  };

  if (showMorningRitual) {
    return (
      <MorningRitual
        onComplete={() => setShowMorningRitual(false)}
        onSkip={() => setShowMorningRitual(false)}
      />
    );
  }

  // Handle carousel item press
  const handleCarouselPress = (item: CarouselItem & { is_series?: boolean }) => {
    if (item.is_series) {
      navigate(`/vod/series/${item.id}`);
    } else {
      navigate(`/vod/${item.id}`);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      {/* Header Bar - Dynamic Culture Clock and Refresh Button */}
      <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center ${IS_TV_BUILD ? 'px-8 pt-4 pb-2' : 'px-4 pt-4 pb-2'}`}>
        {/* Dynamic Culture Clock - shows culture time + local time */}
        <CultureClock
          cultureId={currentCulture?.culture_id}
          showLocalTime
          variant="dual"
        />

        {/* Refresh Button */}
        <Pressable
          onPress={syncContent}
          disabled={syncing}
          className={`w-12 h-12 rounded-full justify-center items-center bg-emerald-500/20 ${syncing ? 'opacity-70 cursor-not-allowed' : ''} transition-all duration-300`}
        >
          <RefreshCw size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Shabbat Mode Banner - appears during Shabbat */}
      <ShabbatModeBanner />

      {/* Shabbat Eve Section - appears on Friday before candle lighting */}
      <ShabbatEveSection />

      {/* Hero Carousel Section */}
      <View className={`${IS_TV_BUILD ? 'px-8 pt-4' : 'px-4 pt-2'}`}>
        {carouselLoading ? (
          <HeroSkeleton />
        ) : (
          <GlassCarousel
            items={carouselItems}
            onItemPress={handleCarouselPress}
            height={IS_TV_BUILD ? 550 : 600}
            autoPlayInterval={6000}
          />
        )}
      </View>

      {/* Continue Watching - loads independently */}
      {continueLoading ? (
        <SectionSkeleton />
      ) : continueWatching.length > 0 && (() => {
        const filteredContinueWatching = showOnlyWithSubtitles
          ? continueWatching.filter(item =>
              item.available_subtitle_languages &&
              item.available_subtitle_languages.length > 0
            )
          : continueWatching;

        return filteredContinueWatching.length > 0 ? (
          <ContentCarousel
            title={t('home.continueWatching')}
            items={filteredContinueWatching}
            className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}
          />
        ) : null;
      })()}

      {/* Live TV - loads independently */}
      {liveLoading ? (
        <SectionSkeleton />
      ) : liveChannels.length > 0 && (
        <View className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}>
          <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between mb-4`}>
            <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
              <View className="flex flex-row items-center bg-red-500 px-2 py-1 rounded gap-1">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                <Text className={`${IS_TV_BUILD ? 'text-[12px]' : 'text-[10px]'} font-bold text-white`}>{t('common.live')}</Text>
              </View>
              <Text className={`${IS_TV_BUILD ? 'text-2xl' : 'text-xl'} font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.liveTV')}</Text>
            </View>
            <Link to="/live" style={{ textDecoration: 'none' }}>
              <Text className={`${IS_TV_BUILD ? 'text-lg' : 'text-sm'} text-purple-600 font-medium`}>{t('home.allChannels')}</Text>
            </Link>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: IS_TV_BUILD ? spacing.md : spacing.sm, paddingRight: spacing.md }}
          >
            {liveChannels.slice(0, 8).map((channel, index) => (
              <AnimatedCard
                key={channel.id}
                index={index}
                variant="carousel"
                isRTL={isRTL}
                className={`${IS_TV_BUILD ? 'w-80' : 'w-60'}`}
              >
                <GlassLiveChannelCard
                  channel={channel}
                  liveLabel={t('common.live')}
                  onPress={() => navigate(`/live/${channel.id}`)}
                />
              </AnimatedCard>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Dynamic Culture Trending - shows trending topics for selected culture */}
      <View className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}>
        <CultureTrendingRow cultureId={currentCulture?.culture_id} />
      </View>

      {/* Dynamic Culture City Rows - shows cities based on selected culture */}
      {cultureCities.map((city) => (
        <View key={city.city_id} className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}>
          <CultureCityRow
            cityId={city.city_id}
            cultureId={currentCulture?.culture_id}
          />
        </View>
      ))}

      {/* Fallback to hardcoded rows if no culture cities loaded yet */}
      {cultureCities.length === 0 && !cultureLoading && (
        <>
          <View className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}>
            <JerusalemRow />
          </View>
          <View className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}>
            <TelAvivRow />
          </View>
        </>
      )}

      {/* Content Filters */}
      <View className={`${IS_TV_BUILD ? 'px-8 my-4' : 'px-4 my-4'} items-start`}>
        <GlassCheckbox
          label={t('home.showOnlyWithSubtitles', 'Show only with subtitles')}
          checked={showOnlyWithSubtitles}
          onChange={setShowOnlyWithSubtitles}
        />
      </View>

      {/* Categories - loads independently */}
      {categoriesLoading ? (
        <>
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </>
      ) : categories.map((category) => {
        const filteredItems = showOnlyWithSubtitles
          ? category.items.filter(item =>
              item.available_subtitle_languages &&
              item.available_subtitle_languages.length > 0
            )
          : category.items;

        if (filteredItems.length === 0) return null;

        return (
          <ContentCarousel
            key={category.id}
            title={getLocalizedName(category, i18n.language)}
            items={filteredItems}
            seeAllLink={`/vod?category=${category.id}`}
            className={`${IS_TV_BUILD ? 'mt-12 px-8' : 'mt-8 px-4'}`}
          />
        );
      })}
    </ScrollView>
  );
}
