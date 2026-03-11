import { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { useAuthStore } from "@/stores/authStore";
import ContentCarousel from "@/components/content/ContentCarousel";
import { WidgetToggleProvider } from "@/contexts/WidgetToggleContext";
import {
  TrendingRow,
  JerusalemRow,
  TelAvivRow,
  GlassCarousel,
  CultureCityRow,
  CultureClock,
  CultureTrendingRow,
} from "@bayit/shared";
import { useCultureStore } from "@bayit/shared-contexts/CultureContext";
import {
  GlassPageHeader,
  HeroCarouselSkeleton,
  RowSkeleton,
} from "@bayit/shared/ui";
import MorningRitual from "@/components/ritual/MorningRitual";
import api, {
  contentService,
  liveService,
  historyService,
  ritualService,
} from "@/services/api";
import { CollectionPromoBanner } from "@/components/banners/CollectionPromoBanner";
import { ShabbatModeBanner, ShabbatEveSection } from "@/components/judaism";
import IsraelisInCitySection from "@/components/home/IsraelisInCitySection";
import IsraeliBusinessesSection from "@/components/home/IsraeliBusinessesSection";
import { colors, spacing } from "@olorin/design-tokens";
import {
  getLocalizedName,
  getLocalizedDescription,
} from "@bayit/shared-utils/contentLocalization";
import { formatContentMetadata } from "@bayit/shared-utils/metadataFormatters";
import { getContentPosterUrl } from "@bayit/shared-utils/youtube";
import WidgetToggleButton from "@/components/content/WidgetToggleButton";
import logger from "@/utils/logger";
import { isSeriesContent } from "@/utils/contentHelpers";
import { useFeaturedAudiobooksCarousel } from "@/hooks/useFeaturedAudiobooksCarousel";
import { useUserGeolocation } from "@/hooks/useUserGeolocation";
import { CreditsBadge } from "@/components/subscription/CreditsBadge";

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== "undefined" && __TV__;

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
  contentType?:
    | "vod"
    | "live"
    | "podcast"
    | "radio"
    | "movie"
    | "series"
    | "channel";
  /** @deprecated Use isSeriesContent() helper from @/utils/contentHelpers instead */
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
  /** @deprecated Use isSeriesContent() helper from @/utils/contentHelpers instead */
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
  name_key?: string;
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

  const [youngstersTrending, setYoungstersTrending] = useState<ContentItem[]>(
    [],
  );
  const [youngstersLoading, setYoungstersLoading] = useState(true);

  const [featuredCollections, setFeaturedCollections] = useState<any[]>([]);

  const [syncing, setSyncing] = useState(false);
  const [showMorningRitual, setShowMorningRitual] = useState(false);

  // Fetch featured audiobooks
  const { audiobooks: featuredAudiobooks, isLoading: audiobooksLoading } =
    useFeaturedAudiobooksCarousel();

  // Location-based content
  const { location, isDetecting: locationDetecting } = useUserGeolocation();

  // Load content on mount - each section loads independently
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    checkMorningRitual();

    // Launch all fetches independently - they don't block each other
    loadFeaturedContent();
    loadLiveChannels();
    loadContinueWatching();
    loadFeaturedCollections();
    loadYoungstersTrending();

    // Fetch cultures for dynamic content
    fetchCultures();
  }, []);

  const checkMorningRitual = async () => {
    // Skip ritual check if not authenticated
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      logger.debug(
        "Skipping morning ritual check - not authenticated",
        "HomePage",
      );
      return;
    }

    try {
      const result = await ritualService.shouldShow();
      if (result.show_ritual) setShowMorningRitual(true);
    } catch (err) {
      logger.debug("Morning ritual check failed", "HomePage", err);
    }
  };

  // Load featured content (hero carousel + categories)
  const loadFeaturedContent = async () => {
    try {
      const featuredData = await contentService.getFeatured();

      // Build carousel items from spotlight data
      const spotlightItems = featuredData.spotlight || [];
      setCarouselItems(
        spotlightItems.map((item: any, index: number) => ({
          id: item.id,
          title: getLocalizedName(item, i18n.language),
          subtitle: formatContentMetadata(item),
          description: getLocalizedDescription(item, i18n.language),
          image: getContentPosterUrl(item) || item.backdrop || item.thumbnail,
          badge: index === 0 ? t("common.new") : undefined,
          contentType: isSeriesContent(item) ? "series" : "vod",
          is_series: isSeriesContent(item),
          available_subtitle_languages: item.available_subtitle_languages,
          has_subtitles: item.has_subtitles,
        })),
      );
      setCarouselLoading(false);

      // Categories from featured data
      setCategories(featuredData.categories || []);
      setCategoriesLoading(false);
    } catch (error) {
      logger.error("Failed to load featured content", "HomePage", error);
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
      logger.error("Failed to load live channels", "HomePage", error);
    } finally {
      setLiveLoading(false);
    }
  };

  // Load continue watching independently
  const loadContinueWatching = async () => {
    // Skip continue watching if not authenticated
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      logger.debug(
        "Skipping continue watching - not authenticated",
        "HomePage",
      );
      setContinueLoading(false);
      return;
    }

    try {
      const continueData = await historyService.getContinueWatching();
      setContinueWatching(continueData.items || []);
    } catch (error) {
      logger.error("Failed to load continue watching", "HomePage", error);
    } finally {
      setContinueLoading(false);
    }
  };

  const loadFeaturedCollections = async () => {
    try {
      const collections = await api.get("/content/collections/recommendations");
      if (Array.isArray(collections) && collections.length > 0) {
        setFeaturedCollections(collections);
      }
    } catch (error) {
      logger.debug("Collection recommendations not available", "HomePage");
    }
  };

  const loadYoungstersTrending = async () => {
    try {
      const response = await api.get("/youngsters/featured");
      setYoungstersTrending(response.items || []);
    } catch (error) {
      logger.debug("Youngsters trending not available", "HomePage");
    } finally {
      setYoungstersLoading(false);
    }
  };

  const syncContent = async () => {
    try {
      setSyncing(true);
      logger.info("Syncing home content...", "HomePage");
      await (contentService as any).syncContent();

      // Reload all sections
      loadFeaturedContent();
      loadLiveChannels();
      loadContinueWatching();
      loadFeaturedCollections();
    } catch (error) {
      logger.error("Failed to sync content", "HomePage", error);
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
  const handleCarouselPress = (
    item: CarouselItem & { is_series?: boolean },
  ) => {
    if (isSeriesContent(item)) {
      navigate(`/vod/series/${item.id}`);
    } else {
      navigate(`/vod/${item.id}`);
    }
  };

  // Collect all content items for widget toggle batch-check
  const widgetItems = useMemo(() => {
    const items: { content_type: string; content_id: string }[] = [];
    for (const item of carouselItems) {
      items.push({ content_type: "vod", content_id: item.id });
    }
    for (const cat of categories) {
      for (const item of cat.items) {
        items.push({ content_type: item.type || "vod", content_id: item.id });
      }
    }
    for (const ch of liveChannels) {
      items.push({ content_type: "live", content_id: ch.id });
    }
    for (const item of continueWatching) {
      items.push({ content_type: item.type || "vod", content_id: item.id });
    }
    return items;
  }, [carouselItems, categories, liveChannels, continueWatching]);

  return (
    <WidgetToggleProvider items={widgetItems}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
      >
        {/* Page Header */}
        <View style={styles.headerSection}>
          <GlassPageHeader
            title={t("nav.home")}
            pageType="home"
            isRTL={isRTL}
          />
        </View>

        {/* Header Bar - Culture Time Clocks */}
        <View style={[styles.headerBar, isRTL && styles.headerBarRTL]}>
          {/* Israeli Clock - Left side */}
          <CultureClock
            cultureId="israeli"
            variant="large"
            style={styles.clockLeft}
          />

          {/* USA Clock - Right side */}
          <CultureClock
            cultureId="usa"
            variant="large"
            style={styles.clockRight}
          />
        </View>

        {/* Shabbat Mode Banner - appears during Shabbat */}
        <ShabbatModeBanner />

        {/* Shabbat Eve Section - appears on Friday before candle lighting */}
        <ShabbatEveSection />

        {/* AI Credits Badge */}
        <CreditsBadge />

        {/* Hero Carousel Section */}
        <View style={styles.carouselSection}>
          {carouselLoading ? (
            <HeroCarouselSkeleton height={IS_TV_BUILD ? 550 : 600} />
          ) : (
            <GlassCarousel
              items={carouselItems}
              onItemPress={handleCarouselPress}
              height={IS_TV_BUILD ? 550 : 600}
              autoPlayInterval={6000}
              renderItemActions={(item) => (
                <WidgetToggleButton
                  contentType="vod"
                  contentId={item.id}
                  title={item.title}
                  coverUrl={item.image}
                />
              )}
            />
          )}
        </View>

        {/* Continue Watching - loads independently */}
        {continueLoading ? (
          <SectionSkeleton />
        ) : (
          continueWatching.length > 0 && (
            <ContentCarousel
              title={t("home.continueWatching")}
              items={continueWatching}
              style={styles.section}
            />
          )
        )}

        {/* AI Featured Collections Carousel */}
        {featuredCollections.length > 0 && (
          <View
            style={[
              styles.section,
              { paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md },
            ]}
          >
            <CollectionPromoBanner
              collections={featuredCollections}
              autoRotate={true}
              rotationInterval={5000}
            />
          </View>
        )}

        {/* Near Me - Israelis in Your City */}
        <IsraelisInCitySection
          location={location}
          isDetecting={locationDetecting}
          style={styles.section}
        />

        {/* Israeli Businesses Near Me */}
        <IsraeliBusinessesSection
          location={location}
          isDetecting={locationDetecting}
          style={styles.section}
        />

        {/* Live TV - loads independently */}
        {liveLoading ? (
          <SectionSkeleton />
        ) : (
          liveChannels.length > 0 && (
            <ContentCarousel
              title={t("home.liveTV")}
              items={liveChannels.slice(0, 8).map((channel) => ({
                id: channel.id,
                title: channel.name,
                thumbnail: channel.logo || channel.thumbnail,
                type: "live" as const,
              }))}
              seeAllLink="/live"
              style={styles.section}
            />
          )
        )}

        {/* Sections in desired order: near-you, trending, Jerusalem, Tel Aviv, then all other categories */}
        {categoriesLoading ? (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        ) : (
          <>
            {/* Near You section is now handled by IsraelisInCitySection component (location-based scraper) */}

            {/* 1. What's Hot in Israel (Trending) */}
            <View style={styles.section}>
              <CultureTrendingRow
                cultureId={currentCulture?.culture_id}
                onTopicPress={(topic) => {
                  if (topic.url) {
                    window.open(topic.url, "_blank", "noopener,noreferrer");
                  }
                }}
              />
            </View>

            {/* Youngsters Section */}
            {youngstersLoading ? (
              <SectionSkeleton />
            ) : (
              youngstersTrending.length > 0 && (
                <ContentCarousel
                  title={t("youngsters.title")}
                  items={youngstersTrending}
                  seeAllLink="/youngsters"
                  style={styles.section}
                />
              )
            )}

            {/* 2 & 3. Jerusalem and Tel Aviv */}
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

            {/* Dynamic Culture City Rows if available */}
            {cultureCities.map((city) => (
              <View key={city.city_id} style={styles.section}>
                <CultureCityRow
                  cityId={city.city_id}
                  cultureId={currentCulture?.culture_id ?? ""}
                />
              </View>
            ))}

            {/* 4-7. Movies, Series, Podcasts, Audiobooks - from API in backend-specified order */}
            {categories
              .filter((cat) => cat.name !== "near-you")
              .map((category) => {
                if (category.items.length === 0) return null;

                // Determine the see-all link based on category type
                let seeAllLink = `/vod?category=${category.id}`;
                if (category.name === "podcasts") {
                  seeAllLink = "/podcasts";
                } else if (category.name === "audiobooks") {
                  seeAllLink = "/audiobooks";
                }

                return (
                  <ContentCarousel
                    key={category.id}
                    title={t(category.name_key || `home.${category.name}`, {
                      defaultValue: getLocalizedName(category, i18n.language),
                    })}
                    items={category.items}
                    seeAllLink={seeAllLink}
                    style={styles.section}
                  />
                );
              })}
          </>
        )}
      </ScrollView>
    </WidgetToggleProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.dark[950],
  },
  pageContent: {
    paddingBottom: spacing.xl * 2,
  },
  // Header Section
  headerSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: spacing.lg,
  },
  // Header Bar - Large clocks
  headerBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: spacing.xl,
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerBarRTL: {
    flexDirection: "row-reverse",
  },
  clockLeft: {
    alignItems: "center",
    flex: 1,
  },
  clockRight: {
    alignItems: "center",
    flex: 1,
  },
  // Carousel Section
  carouselSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  // Sections
  section: {
    marginTop: IS_TV_BUILD ? spacing.xl * 1.5 : spacing.xl,
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginTop: IS_TV_BUILD ? spacing.xl * 2 : spacing.xl * 1.5,
    marginBottom: IS_TV_BUILD ? spacing.xl * 2 : spacing.xl * 1.5,
    marginHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: IS_TV_BUILD ? 28 : 20,
    fontWeight: "700",
    color: colors.text,
  },
  seeAll: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.primary.DEFAULT,
    fontWeight: "500",
  },
  // Skeleton
  skeletonSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  skeletonTitle: {
    width: 150,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  skeletonCard: {
    width: IS_TV_BUILD ? 280 : 200,
    aspectRatio: 16 / 9,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
  },
});
