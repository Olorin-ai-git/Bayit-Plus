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
      const response: ContentResponse = await contentService.getIsraelisInCity(
        location.city,
        location.state
      );

      if (response?.content) {
        const allContent = [
          ...(response.content.news_articles || []),
          ...(response.content.community_events || []),
        ];
        setContent(allContent);
        setCoverage(response.coverage);

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
      }
    } catch (error) {
      logger.error('Failed to load location content', 'IsraelisInCitySection', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Always show something to verify component is rendering
  if (!location) {
    logger.debug('No location available', 'IsraelisInCitySection');
    return null;
  }

  if (isLoading) {
    logger.debug('Loading location content...', 'IsraelisInCitySection');
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Loading Near Me content...</Text>
      </View>
    );
  }

  if (content.length === 0) {
    logger.debug(`No content found for ${location.city}, ${location.state}`, 'IsraelisInCitySection');
    // Show the section anyway with a message
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>
          Near You: {location.city}, {location.state}
        </Text>
        <Text style={styles.debugSubtext}>No Israeli content available for your area yet.</Text>
      </View>
    );
  }

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
    <ContentCarousel
      title={getTitle()}
      items={content}
      seeAllLink={`/location/${location.state}/${location.city}`}
      style={style}
    />
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
