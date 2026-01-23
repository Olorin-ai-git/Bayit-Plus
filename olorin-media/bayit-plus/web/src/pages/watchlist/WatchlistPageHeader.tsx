import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { z } from 'zod';

/**
 * WatchlistPageHeader Component
 *
 * Displays the watchlist page title, item count, and filter chips.
 */

// Zod schema for props validation
const FilterOptionSchema = z.object({
  id: z.enum(['all', 'continue', 'movies', 'series', 'kids', 'judaism', 'podcasts', 'radio']),
  labelKey: z.string(),
});

const WatchlistPageHeaderPropsSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  filter: z.enum(['all', 'movies', 'series', 'continue', 'kids', 'judaism', 'podcasts', 'radio']),
  onFilterChange: z.function().args(z.enum(['all', 'movies', 'series', 'continue', 'kids', 'judaism', 'podcasts', 'radio'])).returns(z.void()),
});

type FilterOption = z.infer<typeof FilterOptionSchema>;
type WatchlistPageHeaderProps = z.infer<typeof WatchlistPageHeaderPropsSchema>;

const filterOptions: FilterOption[] = [
  { id: 'all', labelKey: 'watchlist.filters.all' },
  { id: 'continue', labelKey: 'watchlist.filters.continue' },
  { id: 'movies', labelKey: 'watchlist.filters.movies' },
  { id: 'series', labelKey: 'watchlist.filters.series' },
  { id: 'kids', labelKey: 'watchlist.filters.kids' },
  { id: 'judaism', labelKey: 'watchlist.filters.judaism' },
  { id: 'podcasts', labelKey: 'watchlist.filters.podcasts' },
  { id: 'radio', labelKey: 'watchlist.filters.radio' },
];

export const WatchlistPageHeader: React.FC<WatchlistPageHeaderProps> = ({
  itemCount,
  filter,
  onFilterChange,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const orderedFilters = isRTL ? [...filterOptions].reverse() : filterOptions;

  return (
    <View>
      {/* Header with icon and title */}
      <View className="flex-row items-center px-8 pt-10 pb-6" style={[isRTL ? styles.headerRTL : styles.headerLTR]}>
        <View className="w-[60px] h-[60px] rounded-full bg-purple-500/20 justify-center items-center" style={[isRTL ? styles.iconML : styles.iconMR]}>
          <Text className="text-[28px]">📋</Text>
        </View>
        <View>
          <Text className="text-[36px] font-bold text-white" style={[isRTL ? styles.textRight : styles.textLeft]}>
            {t('watchlist.title')}
          </Text>
          <Text className="text-[16px] text-gray-400 mt-0.5" style={[isRTL ? styles.textRight : styles.textLeft]}>
            {itemCount} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <View className="flex-row flex-wrap gap-2 px-8 mb-6">
        {orderedFilters.map((option) => {
          const isActive = filter === option.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => onFilterChange(option.id)}
              className="px-4 py-2 rounded-full border-2"
              style={[isActive ? styles.chipActive : styles.chipInactive]}
            >
              <Text
                className="text-[14px]"
                style={[isActive ? styles.chipTextActive : styles.chipTextInactive]}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRTL: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },
  headerLTR: {
    justifyContent: 'flex-start',
  },
  iconML: {
    marginLeft: 24,
  },
  iconMR: {
    marginRight: 24,
  },
  textRight: {
    textAlign: 'right',
  },
  textLeft: {
    textAlign: 'left',
  },
  chipActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#a855f7',
  },
  chipInactive: {
    backgroundColor: '#0a0a0a',
    borderColor: 'transparent',
  },
  chipTextActive: {
    color: '#a855f7',
    fontWeight: 'bold',
  },
  chipTextInactive: {
    color: '#9ca3af',
    fontWeight: 'normal',
  },
});
