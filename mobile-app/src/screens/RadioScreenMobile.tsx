/**
 * RadioScreenMobile
 *
 * Mobile-optimized radio screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-4 columns on tablet (based on orientation)
 * - Horizontal scrolling category filters
 * - Touch-optimized station cards
 * - Pull-to-refresh
 * - Live indicator for playing station
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { radioService, contentService } from '@bayit/shared-services';
import { GlassCategoryPill, GlassView, GlassBadge } from '@bayit/shared';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, typography } from '../theme';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('RadioScreenMobile');

interface RadioStation {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  logo?: string;
  thumbnailUrl?: string;
  category?: string;
  frequency?: string;
  isLive?: boolean;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

export const RadioScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [stations, setStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-4 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 4 : 3,
  });

  useEffect(() => {
    loadStations();
  }, [i18n.language]);

  useEffect(() => {
    filterStations();
  }, [selectedCategory, stations]);

  const loadStations = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled for graceful partial failure handling
      const results = await Promise.allSettled([
        radioService.getStations(),
        contentService.getCategories(),
      ]);

      const stationsRes = results[0].status === 'fulfilled' ? results[0].value : { stations: [] };
      const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { categories: [] };

      // Log any failures for debugging
      if (results[0].status === 'rejected') {
        moduleLogger.warn('Failed to load radio stations:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        moduleLogger.warn('Failed to load categories:', results[1].reason);
      }

      const stationsData = (stationsRes.stations || []).map((station: any) => ({
        ...station,
        thumbnailUrl: station.logo || station.thumbnail,
        isLive: true, // All radio stations are live
      }));

      setStations(stationsData);

      const categoriesData = categoriesRes.categories || [];
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      moduleLogger.error('Error loading radio stations:', error);
      setIsLoading(false);
    }
  };

  const filterStations = () => {
    if (!selectedCategory) {
      setFilteredStations(stations);
    } else {
      setFilteredStations(
        stations.filter((station) => station.category === selectedCategory)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStations();
    setRefreshing(false);
  };

  const handleStationPress = (station: RadioStation) => {
    setPlayingStation(station.id);
    navigation.navigate('Player', {
      id: station.id,
      title: getLocalizedName(station, currentLang),
      type: 'radio',
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const renderStation = ({ item }: { item: RadioStation }) => {
    const localizedName = getLocalizedName(item, currentLang);
    const localizedDescription = getLocalizedDescription(item, currentLang);
    const isPlaying = playingStation === item.id;

    return (
      <View className="flex-1 px-1 py-2">
        <Pressable onPress={() => handleStationPress(item)}>
          <GlassView className="p-4 rounded-xl min-h-[240px]">
            {/* Station logo */}
            <View className="relative items-center justify-center mb-4 h-[120px]">
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  className="w-[120px] h-[120px] rounded-full"
                  resizeMode="contain"
                />
              ) : (
                <View className="w-[120px] h-[120px] rounded-full bg-white/10 items-center justify-center">
                  <Text className="text-5xl">📻</Text>
                </View>
              )}

              {/* Live/Playing badge */}
              {isPlaying ? (
                <View className="absolute top-0 right-0">
                  <GlassBadge variant="primary">
                    <View className="flex-row items-center gap-1 px-1.5 py-0.5">
                      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                      <Text className="text-[10px] font-bold text-white">{t('radio.playing')}</Text>
                    </View>
                  </GlassBadge>
                </View>
              ) : (
                <View className="absolute top-0 right-0">
                  <GlassBadge variant="danger">
                    <View className="flex-row items-center gap-1 px-1.5 py-0.5">
                      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.error }} />
                      <Text className="text-[10px] font-bold text-white">{t('common.live')}</Text>
                    </View>
                  </GlassBadge>
                </View>
              )}
            </View>

            {/* Station info */}
            <View className="items-center">
              <Text className="text-white text-center mb-1 text-lg font-semibold" numberOfLines={1}>
                {localizedName}
              </Text>
              {item.frequency && (
                <Text className="text-purple-500 font-semibold mb-1 text-xs">{item.frequency} {t('radio.fmSuffix')}</Text>
              )}
              {localizedDescription && (
                <Text className="text-gray-400 text-center text-sm" numberOfLines={2}>
                  {localizedDescription}
                </Text>
              )}
            </View>
          </GlassView>
        </Pressable>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Category filters - horizontal scroll */}
      {categories.length > 0 && (
        <View className="py-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
          >
            <GlassCategoryPill
              category={{ id: 'all', name: t('radio.allStations') }}
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                category={{
                  id: category.id,
                  name: getLocalizedName(category, currentLang),
                }}
                selected={selectedCategory === category.id}
                onPress={() => handleCategoryPress(category.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Stations grid */}
      <FlatList
        key={`grid-${numColumns}`} // Force re-render when columns change
        data={filteredStations}
        renderItem={renderStation}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-gray-400 text-center text-base" style={{ writingDirection: 'auto' }}>
                {selectedCategory
                  ? t('radio.noStationsInCategory')
                  : t('radio.noStations')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

