/**
 * HeroCarouselTV - Featured content carousel for TV home screen
 *
 * Features:
 * - Large hero section (750pt height) for 10-foot viewing
 * - Horizontal pagination with auto-advance (6 seconds)
 * - TV focus navigation (left/right arrows)
 * - Gradient overlay for text readability
 * - Scale animation on focus (1.05x)
 * - "NEW" badge on first item
 * - Displays title (48pt), subtitle (28pt), description (24pt)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { config } from '../config/appConfig';
import { getContentPosterUrl } from '@bayit/shared-utils/youtube';

const WINDOW_WIDTH = Dimensions.get('window').width;
const HERO_WIDTH = WINDOW_WIDTH - config.tv.safeZoneMarginPt * 2;
const HERO_HEIGHT = 750;
const AUTO_ADVANCE_INTERVAL = 6000; // 6 seconds

export interface HeroItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  backdrop?: string;
  thumbnail?: string;
  poster_url?: string;
  stream_url?: string;
  available_subtitle_languages?: string[];
}

export interface HeroCarouselTVProps {
  items: HeroItem[];
  onItemSelect: (item: HeroItem) => void;
  testID?: string;
}

export const HeroCarouselTV: React.FC<HeroCarouselTVProps> = ({
  items,
  onItemSelect,
  testID,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Auto-advance carousel
  useEffect(() => {
    if (!focused && items.length > 1) {
      autoAdvanceTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % items.length;
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          return nextIndex;
        });
      }, AUTO_ADVANCE_INTERVAL);
    }

    return () => {
      if (autoAdvanceTimer.current) {
        clearInterval(autoAdvanceTimer.current);
      }
    };
  }, [focused, items.length]);

  // Focus animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? config.tv.focusScaleFactor : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [focused]);

  const renderItem = ({ item, index }: { item: HeroItem; index: number }) => {
    const imageUrl = getContentPosterUrl({
      backdrop: item.backdrop,
      thumbnail: item.thumbnail,
      poster_url: item.poster_url,
      stream_url: item.stream_url,
    });

    const isFirst = index === 0;
    const subtitleCount = item.available_subtitle_languages?.length || 0;

    return (
      <Pressable
        onPress={() => onItemSelect(item)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        hasTVPreferredFocus={index === 0}
        accessible
        accessibilityLabel={`Featured: ${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
        accessibilityHint="Select to play"
        style={styles.heroItem}
      >
        <Animated.View
          style={[
            styles.heroCard,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Hero Image */}
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <View style={styles.placeholderIcon} />
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.heroContent}>
              {/* NEW Badge */}
              {isFirst && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}

              {/* Title */}
              <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
                {item.title}
              </Text>

              {/* Subtitle */}
              {item.subtitle && (
                <Text style={styles.heroSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  {item.subtitle}
                </Text>
              )}

              {/* Description */}
              {item.description && (
                <Text style={styles.heroDescription} numberOfLines={3} ellipsizeMode="tail">
                  {item.description}
                </Text>
              )}

              {/* Subtitle Count Indicator */}
              {subtitleCount > 0 && (
                <View style={styles.subtitleIndicator}>
                  <Text style={styles.subtitleIndicatorText}>
                    CC • {subtitleCount} {subtitleCount === 1 ? 'language' : 'languages'}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  };

  const keyExtractor = (item: HeroItem) => item.id;

  const getItemLayout = (_: any, index: number) => ({
    length: HERO_WIDTH + 24,
    offset: (HERO_WIDTH + 24) * index,
    index,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={HERO_WIDTH + 24}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 48,
  },
  listContent: {
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  heroItem: {
    marginRight: 24,
  },
  heroCard: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholderIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 48,
  },
  heroContent: {
    gap: 12,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  newBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 36,
  },
  heroDescription: {
    fontSize: 24,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 32,
    maxWidth: '80%',
  },
  subtitleIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  subtitleIndicatorText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
