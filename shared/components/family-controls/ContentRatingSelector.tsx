/**
 * Content Rating Selector - Select maximum allowed content rating.
 *
 * Ratings:
 * - G: General Audiences (all ages)
 * - PG: Parental Guidance Suggested
 * - PG-13: Parents Strongly Cautioned (13+)
 * - R: Restricted (17+)
 * - TV-MA: Mature Audiences Only (18+)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from '@bayit/shared-i18n';

type ContentRating = 'G' | 'PG' | 'PG-13' | 'R' | 'TV-MA';

interface ContentRatingSelectorProps {
  value: ContentRating;
  onChange: (rating: ContentRating) => void;
  disabled?: boolean;
}

const ratings: ContentRating[] = ['G', 'PG', 'PG-13', 'R', 'TV-MA'];

const ratingColors: Record<ContentRating, string> = {
  G: '#22c55e',
  PG: '#3b82f6',
  'PG-13': '#f59e0b',
  R: '#ef4444',
  'TV-MA': '#dc2626',
};

export const ContentRatingSelector: React.FC<ContentRatingSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const getRatingDescription = (rating: ContentRating): string => {
    const descriptions: Record<ContentRating, string> = {
      G: t('familyControls.ratings.G'),
      PG: t('familyControls.ratings.PG'),
      'PG-13': t('familyControls.ratings.PG13'),
      R: t('familyControls.ratings.R'),
      'TV-MA': t('familyControls.ratings.TVMA'),
    };
    return descriptions[rating];
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <Text style={styles.label}>Maximum Content Rating</Text>
      <Text style={styles.description}>
        Content rated above {value} will be blocked
      </Text>

      <View style={styles.ratings}>
        {ratings.map((rating) => {
          const isSelected = rating === value;
          const isAllowed =
            ratings.indexOf(rating) <= ratings.indexOf(value);

          return (
            <Pressable
              key={rating}
              style={[
                styles.ratingButton,
                isSelected && styles.ratingButtonSelected,
                !isAllowed && styles.ratingButtonDisallowed,
              ]}
              onPress={() => !disabled && onChange(rating)}
              disabled={disabled}
            >
              <View
                style={[
                  styles.ratingBadge,
                  { backgroundColor: isAllowed ? ratingColors[rating] : '#333' },
                ]}
              >
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
              <Text
                style={[
                  styles.ratingDescription,
                  !isAllowed && styles.ratingDescriptionDisallowed,
                ]}
              >
                {getRatingDescription(rating)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  ratings: {
    gap: 8,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingButtonSelected: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  ratingButtonDisallowed: {
    opacity: 0.4,
  },
  ratingBadge: {
    width: 60,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ratingDescription: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  ratingDescriptionDisallowed: {
    color: '#666',
  },
});
