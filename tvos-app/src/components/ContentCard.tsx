/**
 * ContentCard - Individual content item for TV shelves
 *
 * TV-optimized card with:
 * - 320x180 thumbnail (16:9 ratio) for 10-foot viewing
 * - Focus effects: 4pt purple border + 1.1x scale
 * - Loading skeleton
 * - Typography: 28pt+ body, accessible labels
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Image, Animated } from 'react-native';
import { config } from '../config/appConfig';
import { getContentPosterUrl } from '@bayit/shared-utils/youtube';
import { formatContentMetadata } from '@bayit/shared-utils/metadataFormatters';
import { GlassBadgeTV } from './GlassBadgeTV';
import { SubtitleFlagsTV } from './SubtitleFlagsTV';
import styles from './styles/ContentCard.styles';

export interface ContentCardProps {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  backdrop?: string;
  poster_url?: string;
  stream_url?: string;
  type?: string;
  year?: number;
  duration?: string | number;
  rating?: string | number;
  imdb_rating?: number;
  available_subtitle_languages?: string[];
  created_at?: string;
  published_at?: string;
  focused: boolean;
  hasTVPreferredFocus?: boolean;
  onPress: () => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  id, title, subtitle, thumbnail, backdrop, poster_url, stream_url,
  type, year, duration, rating, imdb_rating, available_subtitle_languages,
  created_at, published_at, focused, hasTVPreferredFocus = false, onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const imageUrl = getContentPosterUrl({ backdrop, thumbnail, poster_url, stream_url });

  const metadataSubtitle = subtitle || formatContentMetadata({ year, duration, rating, imdb_rating });

  const isNew = () => {
    const dateStr = created_at || published_at;
    if (!dateStr) return false;
    const contentDate = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now.getTime() - contentDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  };

  const isHighRating = () => {
    const numericRating = typeof rating === 'number' ? rating : imdb_rating;
    return numericRating ? numericRating >= 8.0 : false;
  };

  const showNewBadge = isNew();
  const showRatingBadge = isHighRating();
  const numericRating = typeof rating === 'number' ? rating : imdb_rating;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? config.tv.focusScaleFactor : 1,
        useNativeDriver: true, tension: 50, friction: 7,
      }),
      Animated.timing(borderAnim, {
        toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.1)', '#A855F7'],
  });

  return (
    <Pressable
      onPress={onPress} hasTVPreferredFocus={hasTVPreferredFocus} accessible
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      accessibilityHint={`Select to play ${type || 'content'}`}
      style={styles.container}
    >
      <Animated.View
        style={[styles.card, {
          transform: [{ scale: scaleAnim }], borderColor,
          borderWidth: focused ? config.tv.focusBorderWidth : 1,
        }]}
      >
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : (
            <View style={styles.placeholderContainer}><View style={styles.placeholder} /></View>
          )}
          <View style={styles.badgeContainer}>
            {showNewBadge && <GlassBadgeTV variant="new" />}
            {showRatingBadge && numericRating && (
              <GlassBadgeTV variant="rating" value={numericRating.toFixed(1)} />
            )}
          </View>
          {available_subtitle_languages && available_subtitle_languages.length > 0 && (
            <SubtitleFlagsTV languages={available_subtitle_languages} size="small" position="bottom-right" />
          )}
        </View>
        <View style={styles.contentOverlay}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
            {metadataSubtitle && (
              <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">{metadataSubtitle}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};
