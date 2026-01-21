import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface RecommendedContent {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  year?: number | string;
  rating?: string;
  imdb_rating?: number;
}

export interface RecommendationsCarouselProps {
  recommendations: RecommendedContent[];
  onItemPress?: (item: RecommendedContent) => void;
  title?: string;
}

const RecommendationCard: React.FC<{
  item: RecommendedContent;
  onPress?: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        <View style={styles.cardThumbnail}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.placeholderIcon}>🎬</Text>
            </View>
          )}
          {item.imdb_rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {item.imdb_rating.toFixed(1)}</Text>
            </View>
          )}
          {item.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {item.title}
          </Text>
          {(item.year || item.rating) && (
            <Text style={[styles.cardMeta, { textAlign }]} numberOfLines={1}>
              {item.year}{item.year && item.rating && ' • '}{item.rating}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const RecommendationsCarousel: React.FC<RecommendationsCarouselProps> = ({
  recommendations,
  onItemPress,
  title,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayTitle = title || t('content.youMayAlsoLike', 'You May Also Like');

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { textAlign }]}>{displayTitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {recommendations.map((item, index) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onPress={() => onItemPress?.(item)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: isTV ? spacing.xl : spacing.lg,
  },
  sectionTitle: {
    fontSize: isTV ? 28 : 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: isTV ? spacing.lg : spacing.md,
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
  },
  scrollView: {
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: spacing.sm,
  },
  cardTouchable: {
    marginRight: isTV ? spacing.lg : spacing.md,
  },
  card: {
    width: isTV ? 280 : 180,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  cardThumbnail: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  placeholderIcon: {
    fontSize: isTV ? 48 : 32,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    fontWeight: '600',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: isTV ? 12 : 10,
    color: colors.text,
    fontWeight: '600',
  },
  cardInfo: {
    padding: isTV ? spacing.md : spacing.sm,
  },
  cardTitle: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: isTV ? 24 : 18,
  },
  cardMeta: {
    fontSize: isTV ? 14 : 12,
    color: colors.textMuted,
  },
});

export default RecommendationsCarousel;
