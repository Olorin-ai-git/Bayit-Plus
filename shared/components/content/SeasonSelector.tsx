import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
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
      <View style={styles.singleSeasonContainer}>
        <Text style={styles.singleSeasonText}>
          {t('content.season')} 1 • {seasons[0].episodeCount} {t('content.episodes')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('content.selectSeason')}</Text>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
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
        style={[
          styles.pill,
          isSelected && styles.pillSelected,
          isFocused && styles.pillFocused,
        ]}
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.7}
        // @ts-ignore - TV prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
          {t('content.season')} {season.seasonNumber}
        </Text>
        <Text style={[styles.episodeCount, isSelected && styles.episodeCountSelected]}>
          {season.episodeCount} {t('content.ep')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: isTV ? spacing.lg : spacing.md,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: isTV ? 140 : 100,
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillFocused: {
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillText: {
    fontSize: isTV ? fontSize.md : fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  pillTextSelected: {
    color: '#fff',
  },
  episodeCount: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.textSecondary,
  },
  episodeCountSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  singleSeasonContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  singleSeasonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default SeasonSelector;
