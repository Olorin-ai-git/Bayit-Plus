import { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { useHomePageData } from "@/hooks/useHomePageData";
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
import { CollectionPromoBanner } from "@/components/banners/CollectionPromoBanner";
import { ShabbatModeBanner, ShabbatEveSection } from "@/components/judaism";
import IsraelisInCitySection from "@/components/home/IsraelisInCitySection";
import IsraeliBusinessesSection from "@/components/home/IsraeliBusinessesSection";
import { colors, spacing } from "@olorin/design-tokens";
import { getLocalizedName } from "@bayit/shared-utils/contentLocalization";
import WidgetToggleButton from "@/components/content/WidgetToggleButton";
import { isSeriesContent } from "@/utils/contentHelpers";
import { useFeaturedAudiobooksCarousel } from "@/hooks/useFeaturedAudiobooksCarousel";
import { useUserGeolocation } from "@/hooks/useUserGeolocation";
import { CreditsBadge } from "@/components/subscription/CreditsBadge";
import { PlusFeatureCard } from "@/components/subscription/PlusFeatureCard";
import {
  AIGatewayCard,
  MoreContentCard,
} from "@/components/byoc/AIGatewayCard";
import { useAIGatewayStore } from "@/stores/aiGatewayStore";
import { useBYOCStore } from "@/stores/byocStore";

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== "undefined" && __TV__;

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

  const {
    currentCulture,
    cultureCities,
    fetchCultures,
    isLoading: cultureLoading,
  } = useCultureStore();

  const {
    carouselItems,
    carouselLoading,
    categories,
    categoriesLoading,
    liveChannels,
    liveLoading,
    continueWatching,
    continueLoading,
    featuredCollections,
    youngstersTrending,
    youngstersLoading,
    showMorningRitual,
    refetchAll,
  } = useHomePageData();

  const { audiobooks: featuredAudiobooks, isLoading: audiobooksLoading } =
    useFeaturedAudiobooksCarousel();

  const { location, isDetecting: locationDetecting } = useUserGeolocation();

  const {
    shouldShowCard,
    showDontShowAgain,
    shouldShowMoreContentCard,
    dismiss: dismissAIGateway,
    permanentlyDismiss: permanentlyDismissAIGateway,
    dismissMoreContent,
  } = useAIGatewayStore();

  const byocSources = useBYOCStore((s) => s.sources);
  const hasYouTubeSource = byocSources.some((s) => s.type === "youtube");

  if (showMorningRitual) {
    return (
      <MorningRitual
        onComplete={() => refetchAll()}
        onSkip={() => refetchAll()}
      />
    );
  }

  const handleCarouselPress = (
    item: (typeof carouselItems)[number] & { is_series?: boolean },
  ) => {
    if (isSeriesContent(item)) {
      navigate(`/vod/series/${item.id}`);
    } else {
      navigate(`/vod/${item.id}`);
    }
  };

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
        <View style={styles.headerSection}>
          <GlassPageHeader
            title={t("nav.home")}
            pageType="home"
            isRTL={isRTL}
          />
        </View>

        <View style={[styles.headerBar, isRTL && styles.headerBarRTL]}>
          <CultureClock
            cultureId="israeli"
            variant="large"
            style={styles.clockLeft}
          />
          <CultureClock
            cultureId="usa"
            variant="large"
            style={styles.clockRight}
          />
        </View>

        <ShabbatModeBanner />
        <ShabbatEveSection />
        <CreditsBadge />

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

        <IsraelisInCitySection
          location={location}
          isDetecting={locationDetecting}
          style={styles.section}
        />

        <IsraeliBusinessesSection
          location={location}
          isDetecting={locationDetecting}
          style={styles.section}
        />

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

        {shouldShowCard(hasYouTubeSource) && (
          <AIGatewayCard
            onConnectYouTube={() => navigate("/byoc")}
            onLearnMore={() => navigate("/byoc")}
            onDismiss={dismissAIGateway}
            showDontShowAgain={showDontShowAgain()}
            onDontShowAgain={permanentlyDismissAIGateway}
          />
        )}

        {shouldShowMoreContentCard(hasYouTubeSource) && (
          <MoreContentCard
            onExplore={() => navigate("/byoc")}
            onDismiss={dismissMoreContent}
          />
        )}

        <PlusFeatureCard feature="dubbing" />

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

            <PlusFeatureCard feature="search" />

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

            {cultureCities.map((city) => (
              <View key={city.city_id} style={styles.section}>
                <CultureCityRow
                  cityId={city.city_id}
                  cultureId={currentCulture?.culture_id ?? ""}
                />
              </View>
            ))}

            {categories
              .filter((cat) => cat.name !== "near-you")
              .map((category) => {
                if (category.items.length === 0) return null;

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
  headerSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: spacing.lg,
  },
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
  carouselSection: {
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
    paddingTop: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  section: {
    marginTop: IS_TV_BUILD ? spacing.xl * 1.5 : spacing.xl,
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
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
