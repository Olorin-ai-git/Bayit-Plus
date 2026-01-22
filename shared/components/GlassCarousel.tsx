import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
  findNodeHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
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
      <View className="w-full">
        <GlassView intensity="low" className={clsx(
          "overflow-hidden bg-black/50",
          isMobilePhone ? "rounded-xl" : "rounded-2xl"
        )} style={{ height }}>
          <View className={clsx(
            "flex-1 justify-center items-center",
            isMobilePhone ? "p-4" : "p-8"
          )}>
            <Text className={clsx(
              "mb-2",
              isMobilePhone ? "text-3xl" : "text-5xl"
            )}>🎬</Text>
            <Text className={clsx(
              "font-semibold text-white text-center",
              isMobilePhone ? "text-base" : "text-xl"
            )}>{t('empty.noContent')}</Text>
          </View>
        </GlassView>
      </View>
    );
  }

  const currentItem = items[activeIndex];

  return (
    <View className="w-full">
      <GlassView
        intensity="low"
        className={clsx(
          "overflow-hidden bg-black/50",
          isMobilePhone ? "rounded-xl" : "rounded-2xl",
          isFocused && "border-purple-500 border-[3px]"
        )}
        style={[
          { height },
          // @ts-ignore - Web CSS property for glow effect
          isFocused && Platform.OS === 'web' && { boxShadow: `0 0 20px ${colors.primary}80` }
        ]}
      >
        <TouchableOpacity
          ref={mainCarouselRef}
          activeOpacity={0.95}
          onPress={() => onItemPress?.(currentItem)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="flex-1"
          // @ts-ignore - tvOS specific focus navigation
          hasTVPreferredFocus={Platform.isTV}
          nextFocusLeft={leftArrowNode || undefined}
          nextFocusRight={rightArrowNode || undefined}
        >
          <Animated.View className={clsx(
            "flex-1 relative overflow-hidden",
            isMobilePhone ? "rounded-xl" : "rounded-2xl"
          )} style={{ opacity: fadeAnim }}>
            {/* Background Image */}
            {currentItem.image && (
              <Image
                source={{ uri: currentItem.image }}
                className={clsx(
                  "absolute top-0 left-0 right-0",
                  isMobilePhone ? "rounded-xl" : "rounded-2xl"
                )}
                style={[
                  {
                    height: Platform.isTV ? '130%' : '100%',
                  },
                  // @ts-ignore - Web CSS properties
                  Platform.OS === 'web' && {
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                  }
                ]}
                resizeMode="cover"
              />
            )}

            {/* Gradient Overlay */}
            <View className={clsx(
              "absolute inset-0",
              isMobilePhone ? "rounded-xl bg-black/55" : "rounded-2xl bg-[rgba(13,13,26,0.3)]"
            )} />

            {/* Content Container */}
            <View className={clsx(
              "absolute inset-0 justify-between",
              isMobilePhone ? "p-3" : "p-8"
            )}>
              {/* Badge - Top Right for RTL, Top Left for LTR */}
              {currentItem.badge && (
                <View className={clsx(
                  "absolute",
                  isMobilePhone ? "top-3" : "top-8",
                  isRTL ? (isMobilePhone ? "right-3" : "right-20") : (isMobilePhone ? "left-3" : "left-20")
                )}>
                  <GlassView intensity="high" className={clsx(
                    isMobilePhone ? "px-2 py-1" : "px-4 py-2"
                  )}>
                    <Text className={clsx(
                      "text-purple-500 font-bold",
                      isMobilePhone ? "text-[11px]" : "text-sm"
                    )}>{currentItem.badge}</Text>
                  </GlassView>
                </View>
              )}

              {/* Action Buttons - Top corner opposite to badge */}
              {showActions && currentItem.contentType && (favoritesService || watchlistService) && (
                <View
                  className={clsx(
                    "absolute flex-row z-10",
                    isMobilePhone ? "top-3 gap-1" : "top-8 gap-2",
                    isRTL ? (isMobilePhone ? "left-3" : "left-8") : (isMobilePhone ? "right-3" : "right-8")
                  )}
                  // @ts-ignore - Web only onClick
                  onClick={(e: any) => { e.stopPropagation(); e.preventDefault(); }}
                >
                  {favoritesService && (
                    <Pressable
                      onPress={(e) => handleFavoriteToggle(currentItem, e)}
                      disabled={actionLoading[`fav-${currentItem.id}`]}
                      className={clsx(
                        "justify-center items-center bg-black/50",
                        isMobilePhone ? "w-8 h-8 rounded-2xl" : "w-10 h-10 rounded-[20px]",
                        favoriteStates[currentItem.id] && "bg-white/15"
                      )}
                      style={
                        // @ts-ignore - Web transition
                        Platform.OS === 'web' && {
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }
                      }
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
                      className={clsx(
                        "justify-center items-center bg-black/50",
                        isMobilePhone ? "w-8 h-8 rounded-2xl" : "w-10 h-10 rounded-[20px]",
                        watchlistStates[currentItem.id] && "bg-white/15"
                      )}
                      style={
                        // @ts-ignore - Web transition
                        Platform.OS === 'web' && {
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }
                      }
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
              <View className={clsx(
                "absolute",
                isMobilePhone ? "bottom-12 max-w-[75%]" : "bottom-[100px]",
                isRTL ? (isMobilePhone ? "right-3 items-end" : "right-20 items-end") : (isMobilePhone ? "left-3 items-start" : "left-20 items-start")
              )}>
                <Text
                  className={clsx(
                    "font-bold text-white",
                    isMobilePhone ? "text-xl mb-1" : "text-[42px] mb-2"
                  )}
                  style={{
                    textAlign: isRTL ? 'right' : 'left',
                    textShadowColor: 'rgba(0, 0, 0, 0.9)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: isMobilePhone ? 3 : 4,
                  }}
                  numberOfLines={2}
                >
                  {currentItem.title}
                </Text>
                {currentItem.subtitle && (
                  <Text
                    className={clsx(
                      "font-semibold tracking-wide",
                      isMobilePhone ? "text-[13px] text-white mb-1" : "text-lg text-white/80 mb-3"
                    )}
                    style={{
                      textAlign: isRTL ? 'right' : 'left',
                      ...(isMobilePhone && {
                        textShadowColor: 'rgba(0, 0, 0, 0.8)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }),
                    }}
                    numberOfLines={2}
                  >
                    {currentItem.subtitle}
                  </Text>
                )}
                {currentItem.description && (
                  <Text
                    className={clsx(
                      isMobilePhone ? "text-xs text-white/90 leading-4 max-w-[280px]" : "text-base text-white/80 leading-6 max-w-[500px]"
                    )}
                    style={{
                      textAlign: isRTL ? 'right' : 'left',
                      ...(isMobilePhone && {
                        textShadowColor: 'rgba(0, 0, 0, 0.8)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }),
                    }}
                    numberOfLines={4}
                  >
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
              <View className={clsx(
                "absolute",
                isMobilePhone ? "bottom-3" : "bottom-8",
                isRTL ? (isMobilePhone ? "right-3" : "right-20") : (isMobilePhone ? "left-3" : "left-20")
              )}>
                <GlassView intensity="medium" className={clsx(
                  "flex-row items-center",
                  isRTL ? "flex-row-reverse" : "flex-row",
                  isMobilePhone ? "px-3.5 py-2 gap-1.5" : "px-6 py-3.5 gap-3"
                )}>
                  <Text className={clsx(
                    "text-purple-500",
                    isMobilePhone ? "text-sm" : "text-lg"
                  )}>▶</Text>
                  <Text className={clsx(
                    "font-bold text-white",
                    isMobilePhone ? "text-sm" : "text-lg"
                  )}>{t('common.watchNow')}</Text>
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
              className={clsx(
                "absolute top-1/2 z-10",
                Platform.isTV ? "left-6 -mt-10" : (isMobilePhone ? "left-2 -mt-4" : "left-4 -mt-6")
              )}
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
              <View className={clsx(
                "justify-center items-center bg-black/60 border-white/30",
                Platform.isTV ? "w-20 h-20 rounded-[40px] border-2" : (isMobilePhone ? "w-8 h-8 rounded-2xl border" : "w-12 h-12 rounded-3xl border-2"),
                leftArrowFocused && "border-purple-500 border-[3px] bg-purple-500/30 scale-110"
              )}>
                <Text className={clsx(
                  "text-white font-bold",
                  Platform.isTV ? "text-5xl" : (isMobilePhone ? "text-xl" : "text-3xl")
                )}>{isRTL ? '›' : '‹'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              ref={rightArrowRef as any}
              className={clsx(
                "absolute top-1/2 z-10",
                Platform.isTV ? "right-6 -mt-10" : (isMobilePhone ? "right-2 -mt-4" : "right-4 -mt-6")
              )}
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
              <View className={clsx(
                "justify-center items-center bg-black/60 border-white/30",
                Platform.isTV ? "w-20 h-20 rounded-[40px] border-2" : (isMobilePhone ? "w-8 h-8 rounded-2xl border" : "w-12 h-12 rounded-3xl border-2"),
                rightArrowFocused && "border-purple-500 border-[3px] bg-purple-500/30 scale-110"
              )}>
                <Text className={clsx(
                  "text-white font-bold",
                  Platform.isTV ? "text-5xl" : (isMobilePhone ? "text-xl" : "text-3xl")
                )}>{isRTL ? '‹' : '›'}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Pagination Dots */}
        {items.length > 1 && (
          <View className={clsx(
            "absolute left-0 right-0 flex-row justify-center items-center",
            isMobilePhone ? "bottom-2 gap-1" : "bottom-4 gap-2"
          )}>
            {items.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => transitionToIndex(index)}
                className={isMobilePhone ? "p-0.5" : "p-1"}
              >
                <View
                  className={clsx(
                    "bg-white/30",
                    isMobilePhone ? "w-1.5 h-1.5 rounded-[3px]" : "w-2 h-2 rounded",
                    index === activeIndex && (isMobilePhone ? "w-4 bg-purple-500" : "w-6 bg-purple-500")
                  )}
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

export default GlassCarousel;
