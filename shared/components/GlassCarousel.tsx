import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './ui';
import { SubtitleFlags } from './SubtitleFlags';
import { colors, borderRadius, spacing } from '../theme';
import { useDirection } from '../hooks/useDirection';

type ContentType = 'vod' | 'live' | 'podcast' | 'radio' | 'movie' | 'series' | 'channel';

interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  badge?: string;
  contentType?: ContentType;
  available_subtitle_languages?: string[];
}

interface FavoritesService {
  toggleFavorite: (contentId: string, contentType: string) => Promise<{ is_favorite: boolean }>;
  isFavorite: (contentId: string) => Promise<{ is_favorite: boolean }>;
}

interface WatchlistService {
  toggleWatchlist: (contentId: string, contentType: string) => Promise<{ in_watchlist: boolean }>;
  isInWatchlist: (contentId: string) => Promise<{ in_watchlist: boolean }>;
}

interface GlassCarouselProps {
  items: CarouselItem[];
  onItemPress?: (item: CarouselItem) => void;
  autoPlayInterval?: number;
  height?: number;
  showActions?: boolean;
  favoritesService?: FavoritesService;
  watchlistService?: WatchlistService;
}

export const GlassCarousel: React.FC<GlassCarouselProps> = ({
  items,
  onItemPress,
  autoPlayInterval = 5000,
  height = 320,
  showActions = true,
  favoritesService,
  watchlistService,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [leftArrowFocused, setLeftArrowFocused] = useState(false);
  const [rightArrowFocused, setRightArrowFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Action button states - keyed by content ID
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>({});
  const [watchlistStates, setWatchlistStates] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const handleFavoriteToggle = useCallback(async (item: CarouselItem, e?: any) => {
    // Prevent event propagation on all platforms
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!favoritesService || !item.contentType || actionLoading[`fav-${item.id}`]) return;

    setActionLoading(prev => ({ ...prev, [`fav-${item.id}`]: true }));
    try {
      const result = await favoritesService.toggleFavorite(item.id, item.contentType);
      setFavoriteStates(prev => ({ ...prev, [item.id]: result.is_favorite }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`fav-${item.id}`]: false }));
    }
  }, [favoritesService, actionLoading]);

  const handleWatchlistToggle = useCallback(async (item: CarouselItem, e?: any) => {
    // Prevent event propagation on all platforms
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!watchlistService || !item.contentType || actionLoading[`wl-${item.id}`]) return;

    setActionLoading(prev => ({ ...prev, [`wl-${item.id}`]: true }));
    try {
      const result = await watchlistService.toggleWatchlist(item.id, item.contentType);
      setWatchlistStates(prev => ({ ...prev, [item.id]: result.in_watchlist }));
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`wl-${item.id}`]: false }));
    }
  }, [watchlistService, actionLoading]);

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

              {/* Action Buttons - Top corner opposite to badge */}
              {showActions && currentItem.contentType && (favoritesService || watchlistService) && (
                <View
                  style={[styles.actionButtons, isRTL ? styles.actionButtonsLeft : styles.actionButtonsRight]}
                  // @ts-ignore - Web only onClick
                  onClick={(e: any) => { e.stopPropagation(); e.preventDefault(); }}
                >
                  {favoritesService && (
                    <Pressable
                      onPress={(e) => handleFavoriteToggle(currentItem, e)}
                      disabled={actionLoading[`fav-${currentItem.id}`]}
                      style={[
                        styles.actionButton,
                        favoriteStates[currentItem.id] && styles.actionButtonActive,
                      ]}
                    >
                      <Ionicons
                        name={favoriteStates[currentItem.id] ? 'star' : 'star-outline'}
                        size={20}
                        color={favoriteStates[currentItem.id] ? colors.warning : colors.text}
                      />
                    </Pressable>
                  )}
                  {watchlistService && (
                    <Pressable
                      onPress={(e) => handleWatchlistToggle(currentItem, e)}
                      disabled={actionLoading[`wl-${currentItem.id}`]}
                      style={[
                        styles.actionButton,
                        watchlistStates[currentItem.id] && styles.actionButtonActive,
                      ]}
                    >
                      <Ionicons
                        name={watchlistStates[currentItem.id] ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={watchlistStates[currentItem.id] ? colors.primary : colors.text}
                      />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Text Content - Right for RTL, Left for LTR */}
              <View style={[styles.textSection, isRTL ? styles.textSectionRight : styles.textSectionLeft]}>
                <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {currentItem.title}
                </Text>
                {currentItem.subtitle && (
                  <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                    {currentItem.subtitle}
                  </Text>
                )}
                {currentItem.description && (
                  <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={4}>
                    {currentItem.description}
                  </Text>
                )}
              </View>

              {/* Subtitle Flags */}
              {currentItem.available_subtitle_languages && currentItem.available_subtitle_languages.length > 0 && (
                <SubtitleFlags
                  languages={currentItem.available_subtitle_languages}
                  size="medium"
                  position={isRTL ? 'bottom-left' : 'bottom-right'}
                  isRTL={isRTL}
                />
              )}

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

        {/* Navigation Arrows - RTL aware, TV compatible */}
        {items.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={() => {
                console.log('[GlassCarousel] Left arrow pressed, isRTL:', isRTL);
                if (isRTL) {
                  transitionToNext();
                } else {
                  transitionToPrevious();
                }
              }}
              onFocus={() => {
                console.log('[GlassCarousel] Left arrow focused');
                setLeftArrowFocused(true);
                handleFocus();
              }}
              onBlur={() => {
                setLeftArrowFocused(false);
                handleBlur();
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel={isRTL ? 'Next' : 'Previous'}
              accessibilityRole="button"
            >
              <View style={[
                styles.navButtonInner,
                leftArrowFocused && styles.navButtonFocused
              ]}>
                <Text style={styles.navButtonText}>{isRTL ? '›' : '‹'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => {
                console.log('[GlassCarousel] Right arrow pressed, isRTL:', isRTL);
                if (isRTL) {
                  transitionToPrevious();
                } else {
                  transitionToNext();
                }
              }}
              onFocus={() => {
                console.log('[GlassCarousel] Right arrow focused');
                setRightArrowFocused(true);
                handleFocus();
              }}
              onBlur={() => {
                setRightArrowFocused(false);
                handleBlur();
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel={isRTL ? 'Previous' : 'Next'}
              accessibilityRole="button"
            >
              <View style={[
                styles.navButtonInner,
                rightArrowFocused && styles.navButtonFocused
              ]}>
                <Text style={styles.navButtonText}>{isRTL ? '‹' : '›'}</Text>
              </View>
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
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 10, 10, 0.5)',
    // @ts-ignore - Web CSS property
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }),
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
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Make image taller to show more of the top (heads) instead of center-cropping
    // On TV, we want to see actors' faces, so we extend the image down and crop the bottom
    height: Platform.isTV ? '130%' : '100%',
    borderRadius: borderRadius.lg,
    // Web: position image to show more of the center-top
    ...(Platform.OS === 'web' && {
      objectFit: 'cover',
      objectPosition: 'center 20%',
    }),
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.3)',
    borderRadius: borderRadius.lg,
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
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    marginTop: Platform.isTV ? -40 : -24,
    zIndex: 10,
  },
  navButtonLeft: {
    left: Platform.isTV ? 24 : 16,
  },
  navButtonRight: {
    right: Platform.isTV ? 24 : 16,
  },
  navButtonInner: {
    width: Platform.isTV ? 80 : 48,
    height: Platform.isTV ? 80 : 48,
    borderRadius: Platform.isTV ? 40 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  navButtonText: {
    fontSize: Platform.isTV ? 48 : 32,
    color: colors.text,
    fontWeight: 'bold',
  },
  navButtonFocused: {
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    transform: [{ scale: 1.1 }],
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
  actionButtons: {
    position: 'absolute',
    top: 32,
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  actionButtonsRight: {
    right: 32,
  },
  actionButtonsLeft: {
    left: 32,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web transition
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }),
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export default GlassCarousel;
