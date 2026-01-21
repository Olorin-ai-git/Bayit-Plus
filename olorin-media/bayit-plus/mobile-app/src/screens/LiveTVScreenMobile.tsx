/**
 * LiveTVScreenMobile
 *
 * Mobile-optimized live TV screen with responsive grid
 * Features:
 * - 2 columns on phone (was 4)
 * - 3-4 columns on tablet (based on orientation)
 * - Touch-optimized channel cards
 * - Category filtering
 * - Pull-to-refresh
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { liveService, contentService } from '@bayit/shared-services';
import { GlassCategoryPill } from '@bayit/shared';
import { getLocalizedName, getLocalizedCurrentProgram } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { ChannelCardMobile } from '../components';
import { spacing, colors, typography } from '../theme';

interface Channel {
  id: string;
  number: string;
  name: string;
  name_en?: string;
  name_es?: string;
  logo?: string;
  thumbnailUrl?: string;
  currentProgram?: string;
  current_program?: string;
  current_program_en?: string;
  current_program_es?: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

export const LiveTVScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-4 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 4 : 3,
  });

  useEffect(() => {
    loadChannels();
  }, [i18n.language]);

  useEffect(() => {
    filterChannels();
  }, [selectedCategory, channels]);

  const loadChannels = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled for graceful partial failure handling
      const results = await Promise.allSettled([
        liveService.getChannels(),
        contentService.getCategories(),
      ]);

      const channelsRes = results[0].status === 'fulfilled' ? results[0].value : { channels: [] };
      const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { categories: [] };

      // Log any failures for debugging
      if (results[0].status === 'rejected') {
        console.warn('Failed to load channels:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.warn('Failed to load categories:', results[1].reason);
      }

      const channelsData = (channelsRes.channels || []).map((channel: any) => ({
        ...channel,
        thumbnailUrl: channel.thumbnail || channel.logo,
      }));

      setChannels(channelsData);

      const categoriesData = categoriesRes.categories || [];
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading channels:', error);
      setIsLoading(false);
    }
  };

  const filterChannels = () => {
    if (!selectedCategory) {
      setFilteredChannels(channels);
    } else {
      setFilteredChannels(
        channels.filter((channel) => channel.category === selectedCategory)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  };

  const handleChannelPress = (channel: Channel) => {
    navigation.navigate('Player', {
      id: channel.id,
      title: getLocalizedName(channel, currentLang),
      type: 'live',
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const renderChannel = ({ item }: { item: Channel }) => {
    const localizedName = getLocalizedName(item, currentLang);
    const localizedProgram = getLocalizedCurrentProgram(item, currentLang);

    return (
      <ChannelCardMobile
        channel={{
          id: item.id,
          number: item.number || '',
          name: localizedName,
          thumbnailUrl: item.thumbnailUrl,
          currentShow: localizedProgram,
          isLive: true,
        }}
        onPress={() => handleChannelPress(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Category filters */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            <GlassCategoryPill
              category={{ id: 'all', name: t('live.allChannels') }}
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

      {/* Channels grid */}
      <FlatList
        key={`grid-${numColumns}`} // Force re-render when columns change
        data={filteredChannels}
        renderItem={renderChannel}
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
                  ? t('live.noChannelsInCategory')
                  : t('live.noChannels')}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
