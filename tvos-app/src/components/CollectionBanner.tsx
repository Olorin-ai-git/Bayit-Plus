/**
 * CollectionBanner - Rotating collection promotional banner for tvOS
 *
 * Features:
 * - Auto-rotation through collections every 5 seconds
 * - Smooth fade transitions using Animated API
 * - Focus-aware: pauses rotation when focused
 * - Apple TV remote navigation support
 * - Pagination indicators
 * - Multi-language promo text support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
  TVFocusGuideView,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface Collection {
  id: string;
  title: string;
  title_en?: string;
  thumbnail?: string;
  backdrop?: string;
  promo_text?: string;
  promo_text_en?: string;
  promo_text_es?: string;
  promo_text_fr?: string;
  promo_text_it?: string;
  promo_text_hi?: string;
  promo_text_ta?: string;
  promo_text_bn?: string;
  promo_text_ja?: string;
  promo_text_zh?: string;
  available_movies: number;
  total_movies: number;
}

interface CollectionBannerProps {
  collections: Collection[];
  onPress?: (collectionId: string) => void;
  autoRotate?: boolean;
  rotationInterval?: number;
}

export const CollectionBanner: React.FC<CollectionBannerProps> = ({
  collections,
  onPress,
  autoRotate = true,
  rotationInterval = 5000,
}) => {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentCollection = collections[currentIndex];

  // Get localized promo text
  const getPromoText = (collection: Collection): string => {
    const langMap: Record<string, keyof Collection> = {
      he: 'promo_text',
      en: 'promo_text_en',
      es: 'promo_text_es',
      fr: 'promo_text_fr',
      it: 'promo_text_it',
      hi: 'promo_text_hi',
      ta: 'promo_text_ta',
      bn: 'promo_text_bn',
      ja: 'promo_text_ja',
      zh: 'promo_text_zh',
    };

    const field = langMap[i18n.language] || 'promo_text_en';
    return (collection[field] as string) || collection.promo_text || collection.promo_text_en || '';
  };

  // Get localized title
  const getTitle = (collection: Collection): string => {
    if (i18n.language === 'en') {
      return collection.title_en || collection.title;
    }
    return collection.title;
  };

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || collections.length <= 1 || isFocused) {
      return;
    }

    timerRef.current = setInterval(() => {
      rotateToNext();
    }, rotationInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRotate, collections.length, isFocused, currentIndex, rotationInterval]);

  const rotateToNext = () => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      // Change content
      setCurrentIndex((prev) => (prev + 1) % collections.length);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  };

  const handlePress = () => {
    if (currentCollection && onPress) {
      onPress(currentCollection.id);
    }
  };

  if (!currentCollection) {
    return null;
  }

  const promoText = getPromoText(currentCollection);
  const title = getTitle(currentCollection);
  const posterUrl = currentCollection.thumbnail || currentCollection.backdrop;

  return (
    <TVFocusGuideView style={styles.focusGuide}>
      <Pressable
        onPress={handlePress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={({ focused }) => [
          styles.container,
          focused && styles.containerFocused,
        ]}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Poster Image */}
          {posterUrl && (
            <Image
              source={{ uri: posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          )}

          {/* Text Content */}
          <View style={styles.textContent}>
            {/* Header with pagination */}
            <View style={styles.header}>
              <Text style={styles.aiLabel}>
                {t('vod.collection.aiRecommendation', 'AI RECOMMENDATION')}
              </Text>
              {collections.length > 1 && (
                <View style={styles.pagination}>
                  {collections.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Promo Text */}
            <Text style={styles.promoText} numberOfLines={3}>
              {promoText}
            </Text>

            {/* Movie Count */}
            <Text style={styles.movieCount}>
              {currentCollection.available_movies} {t('vod.collection.movies', 'Movies')}
            </Text>

            {/* CTA */}
            <View style={styles.ctaContainer}>
              <Text style={styles.ctaText}>
                {t('vod.collection.watchNow', 'Watch Now')}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </TVFocusGuideView>
  );
};

const styles = StyleSheet.create({
  focusGuide: {
    marginHorizontal: 60,
    marginVertical: 20,
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  containerFocused: {
    borderColor: 'rgba(107, 33, 168, 0.8)',
    backgroundColor: 'rgba(107, 33, 168, 0.15)',
    transform: [{ scale: 1.02 }],
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  content: {
    flexDirection: 'row',
    padding: 30,
  },
  poster: {
    width: 180,
    height: 270,
    borderRadius: 12,
    marginRight: 30,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  promoText: {
    fontSize: 20,
    lineHeight: 28,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  movieCount: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 20,
  },
  ctaContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#6B21A8',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
