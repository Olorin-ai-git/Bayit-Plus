import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
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

interface Coverage {
  has_content: boolean;
  nearest_major_city?: string;
  content_source?: 'local' | 'nearby';
  distance_miles?: number;
}

interface ContentResponse {
  content: {
    news_articles: ContentItem[];
  };
  coverage: Coverage;
  total_items: number;
}

interface IsraeliBusinessesSectionProps {
  location: LocationData | null;
  isDetecting: boolean;
  style?: any;
}

export default function IsraeliBusinessesSection({
  location,
  isDetecting,
  style,
}: IsraeliBusinessesSectionProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (location && !isDetecting) {
      loadLocationContent();
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.city, location?.state, isDetecting, retryCount]);

  // Trigger animation when content loads
  useEffect(() => {
    if (content.length > 0) {
      logger.debug('Animating businesses section in', 'IsraeliBusinessesSection', { contentCount: content.length });
      // Reset and animate
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [content.length, fadeAnim, slideAnim]);

  const loadLocationContent = async () => {
    if (!location?.city || !location?.state) {
      logger.debug('Skipping business content - location incomplete', 'IsraeliBusinessesSection');
      return;
    }

    try {
      setIsLoading(true);
      logger.debug('Loading business content', 'IsraeliBusinessesSection', {
        city: location.city,
        state: location.state,
        retryCount
      });

      const response: ContentResponse = await contentService.getIsraeliBusinessesInCity(
        location.city,
        location.state
      );

      logger.debug('Business API response', 'IsraeliBusinessesSection', {
        hasContent: Boolean(response?.content),
        businesses: response?.content?.news_articles?.length || 0
      });

      if (response?.content) {
        const businesses = response.content.news_articles || [];

        logger.debug('Setting business content', 'IsraeliBusinessesSection', { count: businesses.length });
        setContent(businesses);
        setCoverage(response.coverage);

        if (businesses.length > 0) {
          if (response.coverage?.content_source === 'nearby') {
            logger.info(
              `Loaded ${businesses.length} businesses from nearby ${response.coverage.nearest_major_city} ` +
              `(${response.coverage.distance_miles} miles) for ${location.city}, ${location.state}`,
              'IsraeliBusinessesSection'
            );
          } else {
            logger.info(
              `Loaded ${businesses.length} businesses for ${location.city}, ${location.state}`,
              'IsraeliBusinessesSection'
            );
          }
        } else if (retryCount < 2) {
          // Scraping in progress. Retry after 10 seconds (up to 2 retries = 20s total wait)
          const delay = 10000;
          logger.info(`Business content empty, retry ${retryCount + 1}/2 in ${delay/1000}s...`, 'IsraeliBusinessesSection');

          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          // Set new timeout and store reference for cleanup
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadLocationContent();
          }, delay);
        }
      }
    } catch (error) {
      logger.error('Failed to load business content', 'IsraeliBusinessesSection', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't block page load - only show section when content is ready
  if (!location || isLoading || content.length === 0) {
    logger.debug('Businesses section not rendering', 'IsraeliBusinessesSection', {
      hasLocation: Boolean(location),
      isLoading,
      contentLength: content.length
    });
    return null;
  }

  logger.debug('Businesses section rendering', 'IsraeliBusinessesSection', { contentLength: content.length });

  // Determine title based on content source
  const getTitle = () => {
    if (coverage?.content_source === 'nearby' && coverage.nearest_major_city) {
      return t('home.israeli_businesses_nearby', {
        city: coverage.nearest_major_city,
      });
    }
    return t('home.israeli_businesses', {
      city: location.city,
      state: location.state,
    });
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <ContentCarousel
        title={getTitle()}
        items={content}
        seeAllLink={`/location/${location.state}/${location.city}`}
        style={style}
      />
    </Animated.View>
  );
}
