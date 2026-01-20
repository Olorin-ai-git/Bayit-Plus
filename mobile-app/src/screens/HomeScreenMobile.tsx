/**
 * HomeScreenMobile
 *
 * Mobile-optimized home screen with virtualized list rendering
 * PERFORMANCE OPTIMIZATIONS:
 * - Replaced ScrollView with SectionList for virtual rendering
 * - Only visible items are rendered (critical for performance)
 * - Supports pull-to-refresh
 * - Responsive grid columns (1 hero phone, 2 tablet)
 * - Content rows with 2-4 columns based on device
 * - Horizontal scrolling carousels
 * - Morning ritual check
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  SectionList,
  RefreshControl,
  StyleSheet,
  Text,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ContentRow } from '@bayit/shared-components';
import { GlassCarousel } from '@bayit/shared-components';
import {
  TrendingRow,
  JerusalemRow,
  TelAvivRow,
  ShabbatModeBanner,
  ShabbatEveSection,
  GlassCheckbox,
} from '@bayit/shared-components';
import {
  contentService,
  liveService,
  historyService,
  ritualService,
} from '@bayit/shared-services';
import {
  getLocalizedName,
  getLocalizedDescription,
} from '@bayit/shared-utils';
import { formatContentMetadata } from '@bayit/shared-utils/metadataFormatters';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { optimizeTMDBImageUrl } from '../utils/imageUtils';
import { spacing, colors, typography } from '../theme';

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

interface Section {
  title: string;
  data: any[];
  renderItem: (item: any) => React.ReactNode;
  id: string;
}

export const HomeScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, direction } = useDirection();
  const { isPhone, isTablet } = useResponsive();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<
    { name: string; items: ContentItem[] }[]
  >([]);
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false);

  const currentLang = i18n.language;

  // Responsive column counts
  const heroColumns = getGridColumns({ phone: 1, tablet: 2 });
  const contentColumns = getGridColumns({ phone: 2, tablet: 4 });

  useEffect(() => {
    checkMorningRitual();
    loadContent();
  }, [i18n.language]);

  const checkMorningRitual = async () => {
    try {
      const result = (await ritualService.shouldShow()) as {
        show_ritual: boolean;
      };
      // Note: Morning ritual navigation disabled for mobile
      // Users can access via proactive suggestion banner or menu instead
      // if (result.show_ritual) {
      //   navigation.navigate('MorningRitual' as never);
      // }
    } catch (err) {
      console.log('Morning ritual check:', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled for graceful partial failure handling
      const results = await Promise.allSettled([
        contentService.getFeatured(),
        liveService.getChannels(),
        historyService.getContinueWatching(),
        contentService.getCategories(),
      ]);

      // Extract results with fallbacks for failed requests
      const featuredRes =
        results[0].status === 'fulfilled' ? results[0].value : { items: [] };
      const liveRes =
        results[1].status === 'fulfilled' ? results[1].value : { channels: [] };
      const historyRes =
        results[2].status === 'fulfilled' ? results[2].value : { items: [] };
      const categoriesRes =
        results[3].status === 'fulfilled' ? results[3].value : { categories: [] };

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const serviceNames = ['featured', 'live', 'history', 'categories'];
          console.warn(`Failed to load ${serviceNames[index]}:`, result.reason);
        }
      });

      // Set carousel from spotlight items (same as tvOS and web)
      const heroItems = featuredRes.hero ? [featuredRes.hero] : [];
      const spotlightItems = featuredRes.spotlight || [];
      const featuredItems = featuredRes.items || featuredRes.picks || [];

      // Carousel uses hero + spotlight items
      const carouselData = [...heroItems, ...spotlightItems].map(
        (item: any) => ({
          id: item.id,
          title: getLocalizedName(item, currentLang),
          subtitle: formatContentMetadata(item),
          description: getLocalizedDescription(item, currentLang),
          image: optimizeTMDBImageUrl(
            item.thumbnail || item.image,
            'backdrop'
          ),
          badge: item.badge,
        })
      );

      setCarouselItems(carouselData);

      // Continue watching
      const continueWatchingData = (historyRes.items || []).map(
        (item: any) => ({
          id: item.id,
          title: getLocalizedName(item, currentLang),
          subtitle: item.subtitle,
          thumbnail: optimizeTMDBImageUrl(item.thumbnail, 'poster'),
          type: item.type,
        })
      );
      setContinueWatching(continueWatchingData);

      // Featured content
      const featuredData = featuredItems.map((item: any) => ({
        id: item.id,
        title: getLocalizedName(item, currentLang),
        subtitle: item.subtitle,
        thumbnail: optimizeTMDBImageUrl(item.thumbnail, 'poster'),
        type: item.type,
      }));
      setFeatured(featuredData);

      // Live channels
      const liveData = (liveRes.channels || [])
        .slice(0, 8)
        .map((channel: any) => ({
          id: channel.id,
          title: getLocalizedName(channel, currentLang),
          subtitle: channel.number,
          thumbnail: optimizeTMDBImageUrl(channel.thumbnail, 'poster'),
          type: 'live',
        }));
      setLiveChannels(liveData);

      // Categories
      const categoriesData = (categoriesRes.categories || []).map(
        (cat: any) => ({
          name: getLocalizedName(cat, currentLang),
          items: (cat.items || []).map((item: any) => ({
            id: item.id,
            title: getLocalizedName(item, currentLang),
            subtitle: item.subtitle,
            thumbnail: optimizeTMDBImageUrl(item.thumbnail, 'poster'),
            type: item.type,
          })),
        })
      );
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading home content:', error);
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleContentPress = (item: ContentItem) => {
    if (item.type === 'live') {
      navigation.navigate('Player', {
        id: item.id,
        title: item.title,
        type: 'live',
      });
    } else {
      navigation.navigate('Player', {
        id: item.id,
        title: item.title,
        type: item.type || 'vod',
      });
    }
  };

  // Memoize sections to prevent unnecessary re-renders
  const sections: Section[] = useMemo(() => {
    const sectionArray: Section[] = [];

    // Header section (logo + banners + carousel)
    sectionArray.push({
      id: 'header',
      title: '',
      data: ['header'],
      renderItem: () => (
        <View>
          <View style={styles.header}>
            <Image
              source={require('../../../shared/assets/images/logos/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <ShabbatModeBanner />
          <ShabbatEveSection
            onNavigate={(route: string) =>
              navigation.navigate(route.split('?')[0] as never)
            }
          />
          {carouselItems.length > 0 && (
            <View style={styles.section}>
              <GlassCarousel
                items={carouselItems}
                onItemPress={(item: CarouselItem) =>
                  handleContentPress(item as ContentItem)
                }
                autoPlay={true}
                height={isPhone ? 200 : 300}
              />
            </View>
          )}
        </View>
      ),
    });

    // Continue watching section
    if (continueWatching.length > 0) {
      sectionArray.push({
        id: 'continueWatching',
        title: t('home.continueWatching'),
        data: [continueWatching],
        renderItem: (items: ContentItem[]) => (
          <View style={styles.section}>
            <ContentRow
              items={items}
              onItemPress={handleContentPress}
              columns={contentColumns}
            />
          </View>
        ),
      });
    }

    // Trending section
    sectionArray.push({
      id: 'trending',
      title: t('trending.title'),
      data: ['trending'],
      renderItem: () => (
        <View style={styles.section}>
          <TrendingRow
            onItemPress={handleContentPress}
            columns={contentColumns}
          />
        </View>
      ),
    });

    // Jerusalem section
    sectionArray.push({
      id: 'jerusalem',
      title: '',
      data: ['jerusalem'],
      renderItem: () => (
        <View style={styles.section}>
          <JerusalemRow />
        </View>
      ),
    });

    // Tel Aviv section
    sectionArray.push({
      id: 'telAviv',
      title: '',
      data: ['telAviv'],
      renderItem: () => (
        <View style={styles.section}>
          <TelAvivRow />
        </View>
      ),
    });

    // Filter section
    sectionArray.push({
      id: 'filters',
      title: '',
      data: ['filters'],
      renderItem: () => (
        <View style={styles.filterSection}>
          <GlassCheckbox
            label={t(
              'home.showOnlyWithSubtitles',
              'Show only with subtitles'
            )}
            checked={showOnlyWithSubtitles}
            onChange={setShowOnlyWithSubtitles}
          />
        </View>
      ),
    });

    // Live channels section
    if (liveChannels.length > 0) {
      sectionArray.push({
        id: 'liveChannels',
        title: t('home.liveNow'),
        data: [liveChannels],
        renderItem: (items: ContentItem[]) => (
          <View style={styles.section}>
            <ContentRow
              items={items}
              onItemPress={handleContentPress}
              columns={contentColumns}
            />
          </View>
        ),
      });
    }

    // Featured section
    if (featured.length > 0) {
      sectionArray.push({
        id: 'featured',
        title: t('home.featured'),
        data: [featured],
        renderItem: (items: ContentItem[]) => (
          <View style={styles.section}>
            <ContentRow
              items={items}
              onItemPress={handleContentPress}
              columns={contentColumns}
            />
          </View>
        ),
      });
    }

    // Categories sections - only show if they have items
    categories
      .filter((category) => category.items && category.items.length > 0)
      .forEach((category) => {
        sectionArray.push({
          id: `category-${category.name}`,
          title: category.name,
          data: [category.items],
          renderItem: (items: ContentItem[]) => (
            <View
              style={[
                styles.section,
                { paddingHorizontal: isRTL ? spacing.md : spacing.xs },
              ]}
            >
              <ContentRow
                items={items}
                onItemPress={handleContentPress}
                columns={contentColumns}
              />
            </View>
          ),
        });
      });

    // Bottom spacer
    sectionArray.push({
      id: 'spacer',
      title: '',
      data: ['spacer'],
      renderItem: () => <View style={styles.bottomSpacer} />,
    });

    return sectionArray;
  }, [
    carouselItems,
    continueWatching,
    featured,
    liveChannels,
    categories,
    showOnlyWithSubtitles,
    contentColumns,
    isPhone,
    isRTL,
    t,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SectionList
        sections={sections.map((section) => ({
          title: section.title,
          data: section.data,
          renderItem: ({ item }) => section.renderItem(item),
        }))}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderSectionHeader={({ section: { title } }) =>
          title ? (
            <Text
              style={[
                styles.sectionTitle,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {title}
            </Text>
          ) : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        scrollIndicatorInsets={{ right: 1 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  logo: {
    width: 100,
    height: 36,
  },
  section: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
