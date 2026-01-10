import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui';
import { colors, borderRadius } from '../theme';
import { useDirection } from '../hooks/useDirection';

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
}

interface GlassCarouselProps {
  items: CarouselItem[];
  onItemPress?: (item: CarouselItem) => void;
  autoPlayInterval?: number;
  height?: number;
}

export const GlassCarousel: React.FC<GlassCarouselProps> = ({
  items,
  onItemPress,
  autoPlayInterval = 5000,
  height = 320,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-play with fade transition
  useEffect(() => {
    if (items.length <= 1) return;

    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        if (!isFocused) {
          transitionToNext();
        }
      }, autoPlayInterval);
    };

    startAutoPlay();

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isFocused, items.length, autoPlayInterval, activeIndex]);

  const transitionToIndex = (newIndex: number) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Change index
      setActiveIndex(newIndex);
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const transitionToNext = () => {
    const nextIndex = (activeIndex + 1) % items.length;
    transitionToIndex(nextIndex);
  };

  const transitionToPrevious = () => {
    const prevIndex = activeIndex === 0 ? items.length - 1 : activeIndex - 1;
    transitionToIndex(prevIndex);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <GlassView intensity="low" style={[styles.carouselWrapper, { height }]}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>{t('empty.noContent')}</Text>
          </View>
        </GlassView>
      </View>
    );
  }

  const currentItem = items[activeIndex];

  return (
    <View style={styles.container}>
      <GlassView
        intensity="low"
        style={[styles.carouselWrapper, { height }, isFocused && styles.carouselFocused]}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => onItemPress?.(currentItem)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.touchable}
        >
          <Animated.View style={[styles.itemContainer, { opacity: fadeAnim }]}>
            {/* Background Image */}
            {currentItem.image && (
              <Image
                source={{ uri: currentItem.image }}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            )}

            {/* Gradient Overlay */}
            <View style={styles.gradientOverlay} />

            {/* Content Container */}
            <View style={styles.contentContainer}>
              {/* Badge - Top Right for RTL, Top Left for LTR */}
              {currentItem.badge && (
                <View style={[styles.badgeContainer, isRTL ? styles.badgeRight : styles.badgeLeft]}>
                  <GlassView intensity="high" style={styles.badge}>
                    <Text style={styles.badgeText}>{currentItem.badge}</Text>
                  </GlassView>
                </View>
              )}

              {/* Text Content - Right for RTL, Left for LTR */}
              <View style={[styles.textSection, isRTL ? styles.textSectionRight : styles.textSectionLeft]}>
                <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {currentItem.title}
                </Text>
                {currentItem.subtitle && (
                  <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {currentItem.subtitle}
                  </Text>
                )}
                {currentItem.description && (
                  <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                    {currentItem.description}
                  </Text>
                )}
              </View>

              {/* Play Button - Right for RTL, Left for LTR */}
              <View style={[styles.playButtonContainer, isRTL ? styles.playButtonRight : styles.playButtonLeft]}>
                <GlassView intensity="medium" style={[styles.playButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.playIcon}>▶</Text>
                  <Text style={styles.playText}>{t('common.watchNow')}</Text>
                </GlassView>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={transitionToPrevious}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <GlassView intensity="high" style={styles.navButtonInner}>
                <Text style={styles.navButtonText}>‹</Text>
              </GlassView>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={transitionToNext}
              onFocus={handleFocus}
              onBlur={handleBlur}
            >
              <GlassView intensity="high" style={styles.navButtonInner}>
                <Text style={styles.navButtonText}>›</Text>
              </GlassView>
            </TouchableOpacity>
          </>
        )}

        {/* Pagination Dots */}
        {items.length > 1 && (
          <View style={styles.pagination}>
            {items.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => transitionToIndex(index)}
                style={styles.dotTouchable}
              >
                <View
                  style={[
                    styles.dot,
                    index === activeIndex && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </GlassView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  carouselWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'visible' as any,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  carouselFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    // @ts-ignore - Web CSS property for glow effect
    boxShadow: `0 0 20px ${colors.primary}80`,
  },
  touchable: {
    flex: 1,
  },
  itemContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.5)',
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: 32,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    position: 'absolute',
    top: 32,
  },
  badgeRight: {
    right: 80,
  },
  badgeLeft: {
    left: 80,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textSection: {
    position: 'absolute',
    bottom: 100,
  },
  textSectionRight: {
    right: 80,
    alignItems: 'flex-end',
  },
  textSectionLeft: {
    left: 80,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    // Text shadow - iOS only (web uses textShadow CSS property)
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      default: {},
    }),
  },
  subtitle: {
    fontSize: 22,
    color: colors.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    maxWidth: 500,
  },
  playButtonContainer: {
    position: 'absolute',
    bottom: 32,
  },
  playButtonRight: {
    right: 80,
  },
  playButtonLeft: {
    left: 80,
  },
  playButton: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  playIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  playText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    zIndex: 10,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  navButtonInner: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 32,
    color: colors.text,
    fontWeight: 'bold',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dotTouchable: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
});

export default GlassCarousel;
