import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
  return (
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonRow}>
        {[1, 2, 3, 4, 5].map((j) => (
          <View key={j} style={styles.skeletonCard} />
        ))}
      </View>
    </View>
  );
}

// Hero skeleton with Avatar placeholder
function HeroSkeleton() {
  const placeholderImage = 'https://image.tmdb.org/t/p/original/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg';

  return (
    <View style={styles.skeletonHero}>
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
      <View style={styles.skeletonHeroOverlay} />
      <View style={styles.skeletonLoadingContainer}>
        <div className="loading-spinner" style={{
          width: IS_TV_BUILD ? 32 : 24,
          height: IS_TV_BUILD ? 32 : 24,
          borderRadius: '50%',
          border: '3px solid rgba(107, 33, 168, 0.3)',
          borderTopColor: '#7e22ce',
        }} />
        <Text style={styles.skeletonLoadingText}>Loading...</Text>
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
        image: item.backdrop || item.thumbnail,
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
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Header Bar - Dynamic Culture Clock and Refresh Button */}
      <View style={[styles.headerBar, isRTL && styles.headerBarRTL]}>
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
          style={[styles.refreshButton, syncing && styles.refreshButtonDisabled]}
        >
          <RefreshCw size={20} color={colors.text} style={syncing ? styles.spinning : undefined} />
        </Pressable>
      </View>

      {/* Shabbat Mode Banner - appears during Shabbat */}
      <ShabbatModeBanner />

      {/* Shabbat Eve Section - appears on Friday before candle lighting */}
      <ShabbatEveSection />

      {/* Hero Carousel Section */}
      <View style={styles.carouselSection}>
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
            style={styles.section}
          />
        ) : null;
      })()}

      {/* Live TV - loads independently */}
      {liveLoading ? (
        <SectionSkeleton />
      ) : liveChannels.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>{t('common.live')}</Text>
              </View>
              <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('home.liveTV')}</Text>
            </View>
            <Link to="/live" style={{ textDecoration: 'none' }}>
              <Text style={styles.seeAll}>{t('home.allChannels')}</Text>
            </Link>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.liveRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {liveChannels.slice(0, 8).map((channel, index) => (
              <AnimatedCard
                key={channel.id}
                index={index}
                variant="carousel"
                isRTL={isRTL}
                style={styles.liveCardWrapper}
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
      <View style={styles.section}>
        <CultureTrendingRow cultureId={currentCulture?.culture_id} />
      </View>

      {/* Dynamic Culture City Rows - shows cities based on selected culture */}
      {cultureCities.map((city) => (
        <View key={city.city_id} style={styles.section}>
          <CultureCityRow
            cityId={city.city_id}
            cultureId={currentCulture?.culture_id}
          />
        </View>
      ))}

      {/* Fallback to hardcoded rows if no culture cities loaded yet */}
      {cultureCities.length === 0 && !cultureLoading && (
        <>
          <View style={styles.section}>
            <JerusalemRow />
          </View>
          <View style={styles.section}>
            <TelAvivRow />
          </View>
        </>
      )}

      {/* Content Filters */}
      <View style={styles.filterSection}>
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
            style={styles.section}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    paddingBottom: spacing.xl * 2,
  },
  // Header Bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBarRTL: {
    flexDirection: 'row-reverse',
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinning: {
    // Visual feedback for spinning state
  },
  // Carousel Section
  carouselSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  // Filter Section
  filterSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    marginVertical: spacing.md,
    alignItems: 'flex-start',
  },
  // Sections
  section: {
    marginTop: IS_TV_BUILD ? spacing.xl * 1.5 : spacing.xl,
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: IS_TV_BUILD ? 28 : 20,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.primary,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveBadgeText: {
    fontSize: IS_TV_BUILD ? 12 : 10,
    fontWeight: '700',
    color: colors.text,
  },
  liveRow: {
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
    paddingRight: spacing.md,
  },
  liveCardWrapper: {
    width: IS_TV_BUILD ? 320 : 240,
  },
  // Skeleton
  skeletonHero: {
    height: IS_TV_BUILD ? 550 : 600,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  skeletonHeroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Use backgroundImage instead of background shorthand for React Native Web
    backgroundImage: 'linear-gradient(to bottom, rgba(10, 10, 20, 0.3) 0%, rgba(10, 10, 20, 0.6) 50%, rgba(10, 10, 20, 0.95) 100%)' as any,
  },
  skeletonLoadingContainer: {
    position: 'absolute',
    bottom: IS_TV_BUILD ? 120 : 80,
    left: IS_TV_BUILD ? spacing.xl * 2 : spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonLoadingText: {
    fontSize: IS_TV_BUILD ? 28 : 22,
    fontWeight: '600',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  skeletonSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  skeletonTitle: {
    width: 150,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonCard: {
    width: IS_TV_BUILD ? 280 : 200,
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
});
