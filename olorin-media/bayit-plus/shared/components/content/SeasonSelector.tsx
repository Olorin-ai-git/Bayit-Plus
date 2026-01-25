import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Season {
  seasonNumber: number;
  episodeCount: number;
  thumbnail?: string;
}

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
  hasTVPreferredFocus?: boolean;
}

/**
 * SeasonSelector Component
 * Horizontal scrollable season pills for series detail pages.
 * D-pad optimized for TV navigation.
 */
export const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  seasons,
  selectedSeason,
  onSeasonChange,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedRef = useRef<View>(null);

  // Scroll to selected season on mount or change
  useEffect(() => {
    if (scrollViewRef.current && selectedSeason > 0) {
      // Calculate approximate scroll position
      const pillWidth = isTV ? 140 : 100;
      const gap = spacing.md;
      const scrollPosition = (selectedSeason - 1) * (pillWidth + gap);

      scrollViewRef.current.scrollTo({
        x: Math.max(0, scrollPosition - SCREEN_WIDTH / 4),
        animated: true,
      });
    }
  }, [selectedSeason]);

  if (seasons.length === 0) {
    return null;
  }

  // Don't show selector if there's only one season
  if (seasons.length === 1) {
    return (
      <View className="py-2 px-2">
        <Text className="text-base text-textSecondary">
          {t('content.season')} 1 • {seasons[0].episodeCount} {t('content.episodes')}
        </Text>
      </View>
    );
  }

  return (
    <View className="my-4">
      <Text className="text-sm text-textSecondary mb-2 px-2">{t('content.selectSeason')}</Text>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-2 gap-4 flex-row"
        className="flex-grow-0"
      >
        {seasons.map((season, index) => {
          const isSelected = season.seasonNumber === selectedSeason;

          return (
            <SeasonPill
              key={season.seasonNumber}
              season={season}
              isSelected={isSelected}
              onPress={() => onSeasonChange(season.seasonNumber)}
              hasTVPreferredFocus={hasTVPreferredFocus && index === 0}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

interface SeasonPillProps {
  season: Season;
  isSelected: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

const SeasonPill: React.FC<SeasonPillProps> = ({
  season,
  isSelected,
  onPress,
  hasTVPreferredFocus,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        className={`flex-row items-center gap-2 ${
          isTV ? 'px-6 py-4' : 'px-4 py-2'
        } rounded-full border ${
          isSelected
            ? 'bg-primary border-primary'
            : 'bg-white/10 border-white/15'
        } ${isFocused ? 'border-2 border-white bg-white/20' : ''} ${
          isTV ? 'min-w-[140px]' : 'min-w-[100px]'
        } justify-center`}
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.7}
        // @ts-ignore - TV prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Text className={`${isTV ? 'text-base' : 'text-sm'} font-semibold ${
          isSelected ? 'text-white' : 'text-white'
        }`}>
          {t('content.season')} {season.seasonNumber}
        </Text>
        <Text className={`${isTV ? 'text-sm' : 'text-xs'} ${
          isSelected ? 'text-white/80' : 'text-textSecondary'
        }`}>
          {season.episodeCount} {t('content.ep')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SeasonSelector;
