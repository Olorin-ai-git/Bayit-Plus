/**
 * HomeScreenMobile
 *
 * Mobile-optimized home screen with responsive layout
 * Features:
 * - Pull-to-refresh
 * - Responsive grid columns (1 hero phone, 2 tablet)
 * - Content rows with 2-4 columns based on device
 * - Horizontal scrolling carousels
 * - Morning ritual check
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
// import { AnimatedLogo } from '@bayit/shared-components';
import { ContentRow } from '@bayit/shared-components';
import { GlassCarousel } from '@bayit/shared-components';
// import { DualClock } from '@bayit/shared-components';
import { TrendingRow } from '@bayit/shared-components';
import { contentService, liveService, historyService, ritualService } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { formatContentMetadata } from '@bayit/shared-utils/metadataFormatters';
import { useDirection } from '@bayit/shared-hooks';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
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
  const [categories, setCategories] = useState<{ name: string; items: ContentItem[] }[]>([]);

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
      const result = await ritualService.shouldShow() as { show_ritual: boolean };
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

      const [featuredRes, liveRes, historyRes, categoriesRes] = await Promise.all([
        contentService.getFeatured(),
        liveService.getChannels(),
        historyService.getContinueWatching(),
        contentService.getCategories(),
      ]) as [any, any, any, any];

      // Set carousel from featured hero items
      const heroItems = featuredRes.hero ? [featuredRes.hero] : [];
      const featuredItems = featuredRes.items || [];

      const carouselData = [...heroItems, ...featuredItems].map((item: any) => ({
        id: item.id,
        title: getLocalizedName(item, currentLang),
        subtitle: formatContentMetadata(item),
        description: getLocalizedDescription(item, currentLang),
        image: item.thumbnail || item.image,
        badge: item.badge,
      }));

      setCarouselItems(carouselData);

      // Continue watching
      const continueWatchingData = (historyRes.items || []).map((item: any) => ({
        id: item.id,
        title: getLocalizedName(item, currentLang),
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        type: item.type,
      }));
      setContinueWatching(continueWatchingData);

      // Featured content
      const featuredData = featuredItems.map((item: any) => ({
        id: item.id,
        title: getLocalizedName(item, currentLang),
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        type: item.type,
      }));
      setFeatured(featuredData);

      // Live channels
      const liveData = (liveRes.channels || []).slice(0, 8).map((channel: any) => ({
        id: channel.id,
        title: getLocalizedName(channel, currentLang),
        subtitle: channel.number,
        thumbnail: channel.thumbnail,
        type: 'live',
      }));
      setLiveChannels(liveData);

      // Categories
      const categoriesData = (categoriesRes.categories || []).map((cat: any) => ({
        name: getLocalizedName(cat, currentLang),
        items: (cat.items || []).map((item: any) => ({
          id: item.id,
          title: getLocalizedName(item, currentLang),
          subtitle: item.subtitle,
          thumbnail: item.thumbnail,
          type: item.type,
        })),
      }));
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
      {/* Header with logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Hero carousel */}
      {carouselItems.length > 0 && (
        <View style={styles.section}>
          <GlassCarousel
            items={carouselItems}
            onItemPress={(item) => handleContentPress(item as any)}
            autoPlay={true}
            height={isPhone ? 200 : 300}
          />
        </View>
      )}

      {/* Continue watching */}
      {continueWatching.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.continueWatching')}</Text>
          <ContentRow
            items={continueWatching}
            onItemPress={handleContentPress}
            columns={contentColumns}
          />
        </View>
      )}

      {/* Trending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('trending.title')}</Text>
        <TrendingRow
          onItemPress={handleContentPress}
          columns={contentColumns}
        />
      </View>

      {/* Live channels */}
      {liveChannels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.liveNow')}</Text>
          <ContentRow
            items={liveChannels}
            onItemPress={handleContentPress}
            columns={contentColumns}
          />
        </View>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
          <ContentRow
            items={featured}
            onItemPress={handleContentPress}
            columns={contentColumns}
          />
        </View>
      )}

      {/* Categories */}
      {categories.map((category) => (
        <View key={category.name} style={styles.section}>
          <Text style={styles.sectionTitle}>{category.name}</Text>
          <ContentRow
            items={category.items}
            onItemPress={handleContentPress}
            columns={contentColumns}
          />
        </View>
      ))}

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  logo: {
    width: 140,
    height: 50,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    writingDirection: 'auto', // Supports RTL/LTR automatically
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
