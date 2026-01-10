import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  trailer_url?: string;
  duration?: number;
  category?: string;
  year?: number;
  rating?: string;
}

interface CinematicHeroProps {
  items: ContentItem[];
  onItemSelect?: (item: ContentItem) => void;
  onItemPlay?: (item: ContentItem) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
}

/**
 * CinematicHero Layout
 * Large auto-playing backdrop with parallax scrolling for TV.
 * D-pad optimized with cinematic focus states.
 */
export const CinematicHero: React.FC<CinematicHeroProps> = ({
  items,
  onItemSelect,
  onItemPlay,
  autoRotate = true,
  rotateInterval = 8000,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focusedButton, setFocusedButton] = useState<string>('play');
  const [showTrailer, setShowTrailer] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  const currentItem = items[currentIndex];

  // Auto-rotate through items
  useEffect(() => {
    if (!autoRotate || items.length <= 1) return;

    const interval = setInterval(() => {
      animateTransition(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      });
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, items.length, rotateInterval]);

  // Animate transition between items
  const animateTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(50),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // Handle item navigation
  const goToItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length || index === currentIndex) return;
    animateTransition(() => setCurrentIndex(index));
  }, [items.length, currentIndex, animateTransition]);

  const goToNext = useCallback(() => {
    goToItem((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, goToItem]);

  const goToPrevious = useCallback(() => {
    goToItem((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, goToItem]);

  // Parallax effect on focus change
  useEffect(() => {
    Animated.spring(parallaxAnim, {
      toValue: focusedButton === 'play' ? 0 : focusedButton === 'more' ? -20 : 20,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [focusedButton, parallaxAnim]);

  // Handle button focus for TV navigation
  const handlePlay = () => {
    if (currentItem) {
      onItemPlay?.(currentItem);
    }
  };

  const handleMoreInfo = () => {
    if (currentItem) {
      onItemSelect?.(currentItem);
    }
  };

  const toggleTrailer = () => {
    setShowTrailer((prev) => !prev);
  };

  if (!items.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>אין תוכן להצגה</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Image with Parallax */}
      <Animated.View
        style={[
          styles.backdropContainer,
          {
            transform: [
              { translateX: parallaxAnim },
              { scale: 1.1 },
            ],
          },
        ]}
      >
        {showTrailer && currentItem?.trailer_url ? (
          <Video
            source={{ uri: currentItem.trailer_url }}
            style={styles.backdrop}
            resizeMode="cover"
            repeat
            muted={false}
          />
        ) : (
          <Image
            source={{ uri: currentItem?.backdrop || currentItem?.thumbnail }}
            style={styles.backdrop}
            resizeMode="cover"
          />
        )}
      </Animated.View>

      {/* Gradient Overlays */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
        style={styles.gradientBottom}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientLeft}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Category Badge */}
        {currentItem?.category && (
          <GlassView style={styles.categoryBadge} intensity="light">
            <Text style={styles.categoryText}>{currentItem.category}</Text>
          </GlassView>
        )}

        {/* Title */}
        <Text style={styles.title}>{currentItem?.title}</Text>

        {/* Metadata */}
        <View style={styles.metadata}>
          {currentItem?.year && (
            <Text style={styles.metaItem}>{currentItem.year}</Text>
          )}
          {currentItem?.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{currentItem.rating}</Text>
            </View>
          )}
          {currentItem?.duration && (
            <Text style={styles.metaItem}>
              {Math.floor(currentItem.duration / 60)} דקות
            </Text>
          )}
        </View>

        {/* Description */}
        {currentItem?.description && (
          <Text style={styles.description} numberOfLines={3}>
            {currentItem.description}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              focusedButton === 'play' && styles.buttonFocused,
            ]}
            onPress={handlePlay}
            onFocus={() => setFocusedButton('play')}
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.primaryButtonText}>צפה עכשיו</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              focusedButton === 'more' && styles.buttonFocused,
            ]}
            onPress={handleMoreInfo}
            onFocus={() => setFocusedButton('more')}
          >
            <Text style={styles.infoIcon}>ℹ</Text>
            <Text style={styles.secondaryButtonText}>מידע נוסף</Text>
          </TouchableOpacity>

          {currentItem?.trailer_url && (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                focusedButton === 'trailer' && styles.buttonFocused,
              ]}
              onPress={toggleTrailer}
              onFocus={() => setFocusedButton('trailer')}
            >
              <Text style={styles.trailerIcon}>🎬</Text>
              <Text style={styles.secondaryButtonText}>
                {showTrailer ? t('video.closeTrailer') : t('video.watchTrailer')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Navigation Indicators */}
      <View style={styles.indicators}>
        {items.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
              focusedButton === `indicator-${index}` && styles.indicatorFocused,
            ]}
            onPress={() => goToItem(index)}
            onFocus={() => setFocusedButton(`indicator-${index}`)}
          />
        ))}
      </View>

      {/* Navigation Arrows (visible on focus) */}
      <View style={styles.navArrows}>
        <TouchableOpacity
          style={[
            styles.navArrow,
            styles.navArrowLeft,
            focusedButton === 'prev' && styles.navArrowFocused,
          ]}
          onPress={goToPrevious}
          onFocus={() => setFocusedButton('prev')}
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navArrow,
            styles.navArrowRight,
            focusedButton === 'next' && styles.navArrowFocused,
          ]}
          onPress={goToNext}
          onFocus={() => setFocusedButton('next')}
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Item Counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {items.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    position: 'relative',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.3,
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  content: {
    position: 'absolute',
    left: isTV ? 80 : 48,
    bottom: isTV ? 80 : 48,
    maxWidth: isTV ? 700 : 500,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  title: {
    fontSize: isTV ? 56 : 42,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  description: {
    fontSize: isTV ? 20 : 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: isTV ? 30 : 24,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: isTV ? 32 : 24,
    paddingVertical: isTV ? 16 : 12,
    borderRadius: borderRadius.lg,
  },
  playIcon: {
    fontSize: isTV ? 20 : 16,
    color: colors.text,
  },
  primaryButtonText: {
    fontSize: isTV ? 20 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: isTV ? 24 : 20,
    paddingVertical: isTV ? 16 : 12,
    borderRadius: borderRadius.lg,
    // @ts-ignore - Web CSS property for blur effect
    backdropFilter: 'blur(10px)',
  },
  infoIcon: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
  },
  trailerIcon: {
    fontSize: isTV ? 18 : 14,
  },
  secondaryButtonText: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  buttonFocused: {
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  indicators: {
    position: 'absolute',
    bottom: isTV ? 30 : 20,
    right: isTV ? 80 : 48,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  indicator: {
    width: isTV ? 40 : 30,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
  },
  indicatorFocused: {
    backgroundColor: '#fff',
  },
  navArrows: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  navArrow: {
    width: isTV ? 60 : 48,
    height: isTV ? 60 : 48,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  navArrowFocused: {
    opacity: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  navArrowLeft: {},
  navArrowRight: {},
  navArrowText: {
    fontSize: isTV ? 36 : 28,
    color: '#fff',
    fontWeight: '300',
  },
  counter: {
    position: 'absolute',
    top: isTV ? 30 : 20,
    right: isTV ? 80 : 48,
  },
  counterText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default CinematicHero;
