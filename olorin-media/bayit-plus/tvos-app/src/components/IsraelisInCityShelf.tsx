/**
 * IsraelisInCityShelf - Location-based content shelf for tvOS
 *
 * Displays "Israelis in [City]" content including:
 * - Local news articles
 * - Community events
 * - City-specific content
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@bayit/shared-services';
import { ContentShelf, ContentItem } from './ContentShelf';
import { queryKeys } from '../config/queryClient';

interface LocationData {
  city: string;
  state: string;
  timestamp: Date;
  source: 'timezone_inferred' | 'cache';
}

interface IsraelisInCityShelfProps {
  location: LocationData | null;
  isDetecting: boolean;
  onItemSelect: (item: ContentItem) => void;
}

export const IsraelisInCityShelf: React.FC<IsraelisInCityShelfProps> = ({
  location,
  isDetecting,
  onItemSelect,
}) => {
  // Only fetch if location is available
  const { data: locationContent, isLoading } = useQuery({
    queryKey: queryKeys.content.location(location?.city || '', location?.state || ''),
    queryFn: async () => {
      if (!location?.city || !location?.state) {
        return null;
      }

      const response = await api.get(
        `/content/israelis-in-city?city=${encodeURIComponent(location.city)}&state=${encodeURIComponent(location.state)}`
      );
      return response.data;
    },
    enabled: !!location && !isDetecting,
  });

  // Combine news and events into single array
  const items: ContentItem[] = locationContent?.content
    ? [
        ...(locationContent.content.news_articles || []),
        ...(locationContent.content.community_events || []),
      ]
    : [];

  // Don't render if no location, loading, or no content
  if (!location || isDetecting || isLoading || items.length === 0) {
    return null;
  }

  return (
    <ContentShelf
      title={`Israelis in ${location.city}, ${location.state}`}
      items={items}
      onItemSelect={onItemSelect}
      testID="israelis-in-city-shelf"
    />
  );
};

const styles = StyleSheet.create({
  // No styles needed - ContentShelf handles all styling
});
