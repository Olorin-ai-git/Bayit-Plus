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
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { config } from '../config/appConfig';
import { getContentPosterUrl } from '@bayit/shared-utils/youtube';
import { SubtitleFlagsTV } from './SubtitleFlagsTV';
import styles, { HERO_WIDTH, AUTO_ADVANCE_INTERVAL } from './styles/HeroCarouselTV.styles';

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
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
      if (autoAdvanceTimer.current) clearInterval(autoAdvanceTimer.current);
    };
  }, [focused, items.length]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? config.tv.focusScaleFactor : 1,
      useNativeDriver: true, tension: 50, friction: 7,
    }).start();
  }, [focused]);

  const renderItem = ({ item, index }: { item: HeroItem; index: number }) => {
    const imageUrl = getContentPosterUrl({
      backdrop: item.backdrop, thumbnail: item.thumbnail,
      poster_url: item.poster_url, stream_url: item.stream_url,
    });
    const isFirst = index === 0;

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
        <Animated.View style={[styles.heroCard, { transform: [{ scale: scaleAnim }] }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.heroPlaceholder}><View style={styles.placeholderIcon} /></View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.heroContent}>
              {isFirst && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('tvos.common.newBadge', 'NEW')}</Text>
                </View>
              )}
              <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.heroSubtitle} numberOfLines={1} ellipsizeMode="tail">{item.subtitle}</Text>
              )}
              {item.description && (
                <Text style={styles.heroDescription} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
              )}
            </View>
          </LinearGradient>
          {item.available_subtitle_languages && item.available_subtitle_languages.length > 0 && (
            <SubtitleFlagsTV languages={item.available_subtitle_languages} size="medium" position="bottom-right" />
          )}
        </Animated.View>
      </Pressable>
    );
  };

  const keyExtractor = (item: HeroItem) => item.id;
  const getItemLayout = (_: any, index: number) => ({
    length: HERO_WIDTH + 24, offset: (HERO_WIDTH + 24) * index, index,
  });

  if (items.length === 0) return null;

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        ref={flatListRef} horizontal data={items} renderItem={renderItem}
        keyExtractor={keyExtractor} getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false} pagingEnabled
        snapToInterval={HERO_WIDTH + 24} snapToAlignment="center"
        decelerationRate="fast" contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 100);
        }}
      />
    </View>
  );
};
