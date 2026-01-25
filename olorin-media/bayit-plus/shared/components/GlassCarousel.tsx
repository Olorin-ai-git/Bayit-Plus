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
  findNodeHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './ui';
import { GlassPlaceholder } from '@olorin/glass-ui';
import { SubtitleFlags } from './SubtitleFlags';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
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

  // Refs for tvOS focus navigation
  const mainCarouselRef = useRef<TouchableOpacity>(null);
  const leftArrowRef = useRef<TouchableOpacity>(null);
  const rightArrowRef = useRef<TouchableOpacity>(null);

  // Node handles for focus navigation
  const [mainCarouselNode, setMainCarouselNode] = useState<number | null>(null);
  const [leftArrowNode, setLeftArrowNode] = useState<number | null>(null);
  const [rightArrowNode, setRightArrowNode] = useState<number | null>(null);

  // Get node handles on mount for tvOS focus navigation
  useEffect(() => {
    if (Platform.isTV) {
      if (mainCarouselRef.current) {
        setMainCarouselNode(findNodeHandle(mainCarouselRef.current));
      }
      if (leftArrowRef.current) {
        setLeftArrowNode(findNodeHandle(leftArrowRef.current));
      }
      if (rightArrowRef.current) {
        setRightArrowNode(findNodeHandle(rightArrowRef.current));
      }
    }
  }, []);

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
            <GlassPlaceholder
              contentType="vod"
              width={400}
              height={600}
              accessibilityRole="image"
              accessibilityLabel="No content available"
              contentReason="unavailable"
            />
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
          ref={mainCarouselRef}
          activeOpacity={0.95}
          onPress={() => onItemPress?.(currentItem)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.touchable}
          // @ts-ignore - tvOS specific focus navigation
          hasTVPreferredFocus={Platform.isTV}
          nextFocusLeft={leftArrowNode || undefined}
          nextFocusRight={rightArrowNode || undefined}
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
                        size={Platform.isTV ? 20 : (Platform.OS === 'web' ? 20 : 16)}
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
                        size={Platform.isTV ? 20 : (Platform.OS === 'web' ? 20 : 16)}
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
              ref={leftArrowRef as any}
              style={[styles.navButton, styles.navButtonLeft]}
              activeOpacity={0.8}
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
              }}
              onBlur={() => {
                console.log('[GlassCarousel] Left arrow blurred');
                setLeftArrowFocused(false);
              }}
              accessible={true}
              accessibilityLabel={isRTL ? 'Next' : 'Previous'}
              accessibilityRole="button"
              // @ts-ignore - tvOS specific focus navigation
              nextFocusRight={mainCarouselNode || undefined}
            >
              <View style={[
                styles.navButtonInner,
                leftArrowFocused && styles.navButtonFocused
              ]}>
                <Text style={styles.navButtonText}>{isRTL ? '›' : '‹'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              ref={rightArrowRef as any}
              style={[styles.navButton, styles.navButtonRight]}
              activeOpacity={0.8}
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
              }}
              onBlur={() => {
                console.log('[GlassCarousel] Right arrow blurred');
                setRightArrowFocused(false);
              }}
              accessible={true}
              accessibilityLabel={isRTL ? 'Previous' : 'Next'}
              accessibilityRole="button"
              // @ts-ignore - tvOS specific focus navigation
              nextFocusLeft={mainCarouselNode || undefined}
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

// Check if we're on a mobile device (not TV, not web)
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const isMobilePhone = isMobile && !Platform.isTV;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  carouselWrapper: {
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
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
    padding: isMobilePhone ? 16 : 32,
  },
  emptyIcon: {
    fontSize: isMobilePhone ? 32 : 48,
    marginBottom: isMobilePhone ? 8 : 16,
  },
  emptyText: {
    fontSize: isMobilePhone ? 16 : 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  carouselFocused: {
    borderColor: colors.primary.DEFAULT,
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
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
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
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
    // Web: position image to show more of the center-top
    ...(Platform.OS === 'web' && {
      objectFit: 'cover',
      objectPosition: 'center 20%',
    }),
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Stronger gradient on mobile for better text contrast
    backgroundColor: isMobilePhone ? 'rgba(0, 0, 0, 0.55)' : 'rgba(13, 13, 26, 0.3)',
    borderRadius: isMobilePhone ? borderRadius.md : borderRadius.lg,
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: isMobilePhone ? 12 : 32,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    position: 'absolute',
    top: isMobilePhone ? 12 : 32,
  },
  badgeRight: {
    right: isMobilePhone ? 12 : 80,
  },
  badgeLeft: {
    left: isMobilePhone ? 12 : 80,
  },
  badge: {
    paddingHorizontal: isMobilePhone ? 8 : 16,
    paddingVertical: isMobilePhone ? 4 : 8,
  },
  badgeText: {
    color: colors.primary.DEFAULT,
    fontSize: isMobilePhone ? 11 : 14,
    fontWeight: 'bold',
  },
  textSection: {
    position: 'absolute',
    bottom: isMobilePhone ? 48 : 100,
    // On mobile, limit width to prevent text from spanning full width
    ...(isMobilePhone && {
      maxWidth: '75%',
    }),
  },
  textSectionRight: {
    right: isMobilePhone ? 12 : 80,
    alignItems: 'flex-end',
  },
  textSectionLeft: {
    left: isMobilePhone ? 12 : 80,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: isMobilePhone ? 20 : 42,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: isMobilePhone ? 4 : 8,
    // Text shadow for better readability
    textShadow: isMobilePhone ? '0 1px 3px rgba(0, 0, 0, 0.9)' : '0 1px 4px rgba(0, 0, 0, 0.9)',
  },
  subtitle: {
    fontSize: isMobilePhone ? 13 : 18,
    color: isMobilePhone ? colors.text : colors.textSecondary,
    marginBottom: isMobilePhone ? 4 : 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    // Text shadow for mobile readability
    ...(isMobilePhone && {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    }),
  },
  description: {
    fontSize: isMobilePhone ? 12 : 16,
    color: isMobilePhone ? 'rgba(255, 255, 255, 0.9)' : colors.textSecondary,
    lineHeight: isMobilePhone ? 16 : 24,
    maxWidth: isMobilePhone ? 280 : 500,
    // Text shadow for mobile readability
    ...(isMobilePhone && {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
    }),
  },
  playButtonContainer: {
    position: 'absolute',
    bottom: isMobilePhone ? 12 : 32,
  },
  playButtonRight: {
    right: isMobilePhone ? 12 : 80,
  },
  playButtonLeft: {
    left: isMobilePhone ? 12 : 80,
  },
  playButton: {
    alignItems: 'center',
    paddingHorizontal: isMobilePhone ? 14 : 24,
    paddingVertical: isMobilePhone ? 8 : 14,
    gap: isMobilePhone ? 6 : 12,
  },
  playIcon: {
    fontSize: isMobilePhone ? 14 : 18,
    color: colors.primary.DEFAULT,
  },
  playText: {
    fontSize: isMobilePhone ? 14 : 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: Platform.isTV ? -40 : (isMobilePhone ? -16 : -24),
    zIndex: 10,
  },
  navButtonLeft: {
    left: Platform.isTV ? 24 : (isMobilePhone ? 8 : 16),
  },
  navButtonRight: {
    right: Platform.isTV ? 24 : (isMobilePhone ? 8 : 16),
  },
  navButtonInner: {
    width: Platform.isTV ? 80 : (isMobilePhone ? 32 : 48),
    height: Platform.isTV ? 80 : (isMobilePhone ? 32 : 48),
    borderRadius: Platform.isTV ? 40 : (isMobilePhone ? 16 : 24),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: isMobilePhone ? 1 : 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonText: {
    fontSize: Platform.isTV ? 48 : (isMobilePhone ? 20 : 32),
    color: colors.text,
    fontWeight: 'bold',
  },
  navButtonFocused: {
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    transform: [{ scale: 1.1 }],
  },
  pagination: {
    position: 'absolute',
    bottom: isMobilePhone ? 8 : 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isMobilePhone ? 4 : 8,
  },
  dotTouchable: {
    padding: isMobilePhone ? 2 : 4,
  },
  dot: {
    width: isMobilePhone ? 6 : 8,
    height: isMobilePhone ? 6 : 8,
    borderRadius: isMobilePhone ? 3 : 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    width: isMobilePhone ? 16 : 24,
    backgroundColor: colors.primary[600],
  },
  actionButtons: {
    position: 'absolute',
    top: isMobilePhone ? 12 : 32,
    flexDirection: 'row',
    gap: isMobilePhone ? spacing.xs : spacing.sm,
    zIndex: 10,
  },
  actionButtonsRight: {
    right: isMobilePhone ? 12 : 32,
  },
  actionButtonsLeft: {
    left: isMobilePhone ? 12 : 32,
  },
  actionButton: {
    width: isMobilePhone ? 32 : 40,
    height: isMobilePhone ? 32 : 40,
    borderRadius: isMobilePhone ? 16 : 20,
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
