import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ContentCarousel from '@/components/content/ContentCarousel';
import { contentService } from '@/services/api';
import logger from '@/utils/logger';
import { colors, spacing } from '@olorin/design-tokens';

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
    community_events: ContentItem[];
  };
  coverage: Coverage;
  total_items: number;
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
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (location && !isDetecting) {
      loadLocationContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.city, location?.state, isDetecting]);

  // Trigger animation when content loads
  useEffect(() => {
    if (content.length > 0) {
      console.log('=== ANIMATING SECTION IN ===', { contentCount: content.length });
      // Use requestAnimationFrame to ensure initial state is painted before transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    }
  }, [content.length]);

  const loadLocationContent = async () => {
    if (!location?.city || !location?.state) {
      logger.debug('Skipping location content - location incomplete', 'IsraelisInCitySection');
      return;
    }

    try {
      setIsVisible(false); // Reset animation state
      setIsLoading(true);
      console.log('=== LOADING LOCATION CONTENT ===', {
        city: location.city,
        state: location.state,
        retryCount
      });

      const response: ContentResponse = await contentService.getIsraelisInCity(
        location.city,
        location.state
      );

      console.log('=== API RESPONSE ===', {
        hasContent: Boolean(response?.content),
        articles: response?.content?.news_articles?.length || 0,
        events: response?.content?.community_events?.length || 0
      });

      if (response?.content) {
        const allContent = [
          ...(response.content.news_articles || []),
          ...(response.content.community_events || []),
        ];

        console.log('=== SETTING CONTENT ===', { count: allContent.length });
        setContent(allContent);
        setCoverage(response.coverage);

        if (allContent.length > 0) {
          if (response.coverage?.content_source === 'nearby') {
            logger.info(
              `Loaded ${allContent.length} items from nearby ${response.coverage.nearest_major_city} ` +
              `(${response.coverage.distance_miles} miles) for ${location.city}, ${location.state}`,
              'IsraelisInCitySection'
            );
          } else {
            logger.info(
              `Loaded ${allContent.length} items for ${location.city}, ${location.state}`,
              'IsraelisInCitySection'
            );
          }
        } else if (retryCount < 2) {
          // Scraping in progress. Retry after 10 seconds (up to 2 retries = 20s total wait)
          const delay = 10000;
          logger.info(`Content empty, retry ${retryCount + 1}/2 in ${delay/1000}s...`, 'IsraelisInCitySection');
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            loadLocationContent();
          }, delay);
        }
      }
    } catch (error) {
      logger.error('Failed to load location content', 'IsraelisInCitySection', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't block page load - only show section when content is ready
  if (!location || isLoading || content.length === 0) {
    console.log('=== SECTION NOT RENDERING ===', {
      hasLocation: Boolean(location),
      isLoading,
      contentLength: content.length
    });
    return null;
  }

  console.log('=== SECTION RENDERING ===', { contentLength: content.length });

  // Determine title based on content source
  const getTitle = () => {
    if (coverage?.content_source === 'nearby' && coverage.nearest_major_city) {
      const distance = coverage.distance_miles ? ` (${coverage.distance_miles} miles away)` : '';
      return `Near You - Content from ${coverage.nearest_major_city}${distance}`;
    }
    return t('home.israelis_in_city', {
      city: location.city,
      state: location.state,
    });
  };

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease-out, transform 600ms ease-out',
      }}
    >
      <ContentCarousel
        title={getTitle()}
        items={content}
        seeAllLink={`/location/${location.state}/${location.city}`}
        style={style}
      />
    </div>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    margin: spacing.md,
  },
  debugText: {
    color: colors.text,
    fontSize: 14,
  },
  debugTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  debugSubtext: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
