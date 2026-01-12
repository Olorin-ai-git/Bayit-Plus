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
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { contentService } from '@bayit/shared-services';
import { GlassCategoryPill, GlassView, GlassBadge } from '@bayit/shared';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, typography } from '../theme';

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

      const [stationsRes, categoriesRes] = await Promise.all([
        contentService.getRadioStations(),
        contentService.getCategories(),
      ]) as [any, any];

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
      console.error('Error loading radio stations:', error);
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
      <View style={styles.stationWrapper}>
        <Pressable onPress={() => handleStationPress(item)}>
          <GlassView style={styles.stationCard}>
            {/* Station logo */}
            <View style={styles.logoContainer}>
              {item.thumbnailUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.logo, styles.logoPlaceholder]}>
                  <Text style={styles.logoText}>📻</Text>
                </View>
              )}

              {/* Live/Playing badge */}
              {isPlaying ? (
                <View style={styles.playingBadge}>
                  <GlassBadge variant="primary">
                    <View style={styles.playingContainer}>
                      <View style={styles.playingIndicator} />
                      <Text style={styles.playingText}>PLAYING</Text>
                    </View>
                  </GlassBadge>
                </View>
              ) : (
                <View style={styles.liveBadge}>
                  <GlassBadge variant="error">
                    <View style={styles.liveContainer}>
                      <View style={styles.liveIndicator} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </GlassBadge>
                </View>
              )}
            </View>

            {/* Station info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {localizedName}
              </Text>
              {item.frequency && (
                <Text style={styles.frequency}>{item.frequency} FM</Text>
              )}
              {localizedDescription && (
                <Text style={styles.description} numberOfLines={2}>
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
    <View style={styles.container}>
      {/* Category filters - horizontal scroll */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
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
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoriesSection: {
    paddingVertical: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  stationWrapper: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  stationCard: {
    padding: spacing.md,
    borderRadius: 12,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    height: 100,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
  },
  liveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  liveText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  playingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  playingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  playingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  playingText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  info: {
    alignItems: 'center',
  },
  name: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  frequency: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
