import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService } from '@/services/api';
import logger from '@/utils/logger';

interface LocationData {
  city: string;
  state: string;
  county?: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  source: 'geolocation' | 'cache' | 'timezone_inferred';
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  description?: string;
  published_at?: string;
  event_date?: string;
  event_location?: string;
}

interface IsraelisInCitySectionProps {
  location: LocationData | null;
  isDetecting: boolean;
  style?: any;
}

export default function IsraelisInCitySection({
  location,
  isDetecting,
  style,
}: IsraelisInCitySectionProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (location && !isDetecting) {
      loadLocationContent();
    }
  }, [location, isDetecting]);

  const loadLocationContent = async () => {
    if (!location?.city || !location?.state) {
      logger.debug('Skipping location content - location incomplete', 'IsraelisInCitySection');
      return;
    }

    try {
      setIsLoading(true);
      const response = await contentService.getIsraelisInCity(
        location.city,
        location.state
      );

      if (response?.content) {
        const allContent = [
          ...(response.content.news_articles || []),
          ...(response.content.community_events || []),
        ];
        setContent(allContent);
        logger.info(
          `Loaded ${allContent.length} items for ${location.city}, ${location.state}`,
          'IsraelisInCitySection'
        );
      }
    } catch (error) {
      logger.error('Failed to load location content', 'IsraelisInCitySection', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!location || isLoading || content.length === 0) {
    return null;
  }

  return (
    <ContentCarousel
      title={t('home.israelis_in_city', {
        city: location.city,
        state: location.state,
      })}
      items={content}
      seeAllLink={`/location/${location.state}/${location.city}`}
      style={style}
    />
  );
}
