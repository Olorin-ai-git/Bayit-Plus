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
import { View, Text, Pressable, Image, StyleSheet, Animated } from 'react-native';
import { config } from '../config/appConfig';
import { getContentPosterUrl, extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@bayit/shared-utils/youtube';
import { formatContentMetadata, formatDuration } from '@bayit/shared-utils/metadataFormatters';
import { GlassBadgeTV } from './GlassBadgeTV';

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
  id,
  title,
  subtitle,
  thumbnail,
  backdrop,
  poster_url,
  stream_url,
  type,
  year,
  duration,
  rating,
  imdb_rating,
  available_subtitle_languages,
  created_at,
  published_at,
  focused,
  hasTVPreferredFocus = false,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  // Implement robust image fallback chain
  const imageUrl = getContentPosterUrl({ backdrop, thumbnail, poster_url, stream_url });

  // Generate metadata subtitle if not provided
  const metadataSubtitle = subtitle || formatContentMetadata({
    year,
    duration,
    rating,
    imdb_rating,
  });

  // Add subtitle language indicator
  const subtitleCount = available_subtitle_languages?.length || 0;
  const finalSubtitle = subtitleCount > 0
    ? `${metadataSubtitle}${metadataSubtitle ? ' • ' : ''}🎬 ${subtitleCount} lang${subtitleCount === 1 ? '' : 's'}`
    : metadataSubtitle;

  // Determine if content is new (< 7 days old)
  const isNew = () => {
    const dateStr = created_at || published_at;
    if (!dateStr) return false;

    const contentDate = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now.getTime() - contentDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  };

  // Determine if rating is high (>= 8.0)
  const isHighRating = () => {
    const numericRating = typeof rating === 'number' ? rating : imdb_rating;
    return numericRating ? numericRating >= 8.0 : false;
  };

  const showNewBadge = isNew();
  const showRatingBadge = isHighRating();
  const numericRating = typeof rating === 'number' ? rating : imdb_rating;

  // Animate focus effects
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? config.tv.focusScaleFactor : 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(borderAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.1)', '#A855F7'],
  });

  return (
    <Pressable
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessible
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      accessibilityHint={`Select to play ${type || 'content'}`}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
            borderColor,
            borderWidth: focused ? config.tv.focusBorderWidth : 1,
          },
        ]}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholder} />
            </View>
          )}

          {/* Badges overlay on thumbnail */}
          <View style={styles.badgeContainer}>
            {showNewBadge && <GlassBadgeTV variant="new" />}
            {showRatingBadge && numericRating && (
              <GlassBadgeTV variant="rating" value={numericRating.toFixed(1)} />
            )}
          </View>
        </View>

        {/* Content overlay */}
        <View style={styles.contentOverlay}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
            {finalSubtitle && (
              <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
                {finalSubtitle}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  card: {
    width: 320,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,20,35,0.85)',
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  contentOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: config.tv.minBodyTextSizePt * 1.2,
  },
  subtitle: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
});
