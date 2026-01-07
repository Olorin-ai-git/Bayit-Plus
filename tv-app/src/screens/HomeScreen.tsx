import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import {
  AnimatedLogo,
  ContentRow,
  GlassCarousel,
  DualClock,
  TrendingRow,
} from '../components';
import { contentService, liveService, historyService, ritualService } from '../services/api';
import { colors, spacing } from '../theme';

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

export const HomeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; items: ContentItem[] }[]>([]);

  const currentLang = i18n.language;
  const isHebrew = currentLang === 'he';

  // Helper to get localized title based on current language
  const getLocalizedTitle = (item: any) => {
    if (currentLang === 'he') {
      return item.title || item.name;
    }
    if (currentLang === 'es') {
      return item.title_es || item.name_es || item.title_en || item.name_en || item.title || item.name;
    }
    // Default to English
    return item.title_en || item.name_en || item.title || item.name;
  };

  // Helper to get localized description
  const getLocalizedDescription = (item: any) => {
    if (currentLang === 'he') {
      return item.description;
    }
    if (currentLang === 'es') {
      return item.description_es || item.description_en || item.description;
    }
    return item.description_en || item.description;
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
  }, [i18n.language]);

  const checkMorningRitual = async () => {
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

      // Load all content in parallel - demo service handles mock data
      const [featuredRes, liveRes, historyRes, categoriesRes] = await Promise.all([
        contentService.getFeatured(),
        liveService.getChannels(),
        historyService.getContinueWatching(),
        contentService.getCategories(),
      ]) as [any, any, any, any];

      // Set carousel from featured hero items
      const heroItems = featuredRes.hero ? [featuredRes.hero] : [];
      const spotlightItems = featuredRes.spotlight || [];
      setCarouselItems([...heroItems, ...spotlightItems].map((item: any, index: number) => ({
        id: item.id,
        title: getLocalizedTitle(item),
        subtitle: getLocalizedDescription(item),
        description: getLocalizedDescription(item),
        image: item.backdrop || item.thumbnail,
        badge: index === 0 ? t('common.new') : undefined,
      })));

      // Set featured content
      setFeatured((featuredRes.items || featuredRes.picks || []).map((item: any) => ({
        ...item,
        title: getLocalizedTitle(item),
      })));

      // Set live channels
      setLiveChannels((liveRes.channels || []).map((ch: any) => ({
        id: ch.id,
        title: getLocalizedTitle(ch),
        subtitle: getLocalizedField(ch, 'current_program') || t('home.liveNow'),
        thumbnail: ch.logo,
        type: 'live',
      })));

      // Set continue watching from history
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
      <View style={styles.loadingContainer}>
        <AnimatedLogo size="large" />
        <Text style={[styles.loadingText, { textAlign }]}>{t('home.loadingContent')}</Text>
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Logo */}
      <View style={styles.headerSection}>
        <AnimatedLogo size="medium" />
      </View>

      {/* Dual Analog Clock */}
      <View style={styles.clockSection}>
        <DualClock />
      </View>

      {/* Hero Carousel */}
      <View style={styles.carouselSection}>
        <GlassCarousel
          items={carouselItems}
          onItemPress={handleCarouselPress}
          height={450}
          autoPlayInterval={6000}
        />
      </View>

      {/* Trending in Israel */}
      <View style={styles.trendingSection}>
        <TrendingRow
          onTopicPress={(topic) => {
            // Navigate to search with localized topic title
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

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContentRow
          title={t('home.continueWatching')}
          items={continueWatching}
          onItemPress={handleItemPress}
        />
      )}

      {/* Live TV */}
      <ContentRow
        title={t('home.liveChannels')}
        items={liveChannels}
        onItemPress={(item) => handleItemPress({ ...item, type: 'live' })}
      />

      {/* Featured */}
      <ContentRow
        title={t('home.featuredContent')}
        items={featured}
        onItemPress={handleItemPress}
      />

      {/* Categories */}
      {categories.map((category) => (
        <ContentRow
          key={category.name}
          title={t(`home.${category.name}`)}
          items={category.items}
          onItemPress={handleItemPress}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: 32,
  },
  headerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  clockSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  carouselSection: {
    paddingHorizontal: 48,
    marginBottom: 32,
  },
  trendingSection: {
    marginBottom: spacing.lg,
  },
});

export default HomeScreen;
