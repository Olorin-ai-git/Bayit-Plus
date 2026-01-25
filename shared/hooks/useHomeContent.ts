import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contentService, liveService, historyService } from '../services/api';
import { getLocalizedName, getLocalizedDescription } from '../utils/contentLocalization';
import { formatContentMetadata } from '../utils/metadataFormatters';

export interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
}

export interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
}

export interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
}

export const useHomeContent = (isAuthenticated: boolean) => {
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<{ name: string; items: ContentItem[] }[]>([]);

  const currentLang = i18n.language;

  // Helper to get localized title
  const getLocalizedTitle = (item: any) => {
    return getLocalizedName(item, currentLang);
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
    loadContent();
  }, [i18n.language, isAuthenticated]);

  const loadContent = async () => {
    try {
      setIsLoading(true);

      // Build request array - only include authenticated endpoints when logged in
      const requests: Promise<any>[] = [
        contentService.getFeatured(),
        liveService.getChannels(),
        contentService.getCategories(),
      ];

      // Only fetch history if authenticated
      if (isAuthenticated) {
        requests.push(historyService.getContinueWatching());
      }

      // Load all content in parallel using allSettled
      const results = await Promise.allSettled(requests);

      // Extract successful results, using empty defaults for failed calls
      const featuredRes = results[0].status === 'fulfilled' ? results[0].value : { hero: null, spotlight: [], items: [] };
      const liveRes = results[1].status === 'fulfilled' ? results[1].value : { channels: [] };
      const categoriesRes = results[2].status === 'fulfilled' ? results[2].value : { categories: [] };
      const historyRes = isAuthenticated && results[3]?.status === 'fulfilled' ? results[3].value : { items: [] };

      // Set carousel from featured hero items
      const heroItems = featuredRes.hero ? [featuredRes.hero] : [];
      const spotlightItems = featuredRes.spotlight || [];
      setCarouselItems([...heroItems, ...spotlightItems].map((item: any, index: number) => ({
        id: item.id,
        title: getLocalizedTitle(item),
        subtitle: formatContentMetadata(item),
        description: getLocalizedDescription(item, currentLang),
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
        name: getLocalizedTitle(ch),
        thumbnail: ch.thumbnail,
        logo: ch.logo,
        currentShow: getLocalizedField(ch, 'current_program') || t('home.liveNow'),
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
      // Error handling - silent failure
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    carouselItems,
    continueWatching,
    featured,
    liveChannels,
    categories,
  };
};
