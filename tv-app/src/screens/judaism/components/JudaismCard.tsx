/**
 * JudaismCard component - Content card for Judaism items.
 */

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import { useDirection } from '@bayit/shared/hooks';
import { styles } from '../JudaismScreen.styles';
import { JudaismItem, CATEGORY_ICONS } from '../types';

interface JudaismCardProps {
  item: JudaismItem;
  onPress: () => void;
  index: number;
  getLocalizedText: (item: any, field: string) => string;
}

export const JudaismCard: React.FC<JudaismCardProps> = ({
  item,
  onPress,
  index,
  getLocalizedText,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { isRTL, textAlign } = useDirection();
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️';

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Always prefer hqdefault (480x360) which is always available for any YouTube video
  // maxresdefault (1280x720) is not always available and causes 404 errors
  const getThumbnailUrl = (): string | null => {
    if (!item.thumbnail) return null;

    // Convert any maxresdefault URLs to hqdefault for reliability
    if (item.thumbnail.includes('maxresdefault')) {
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }

    // For other YouTube thumbnails or non-YouTube images
    return thumbnailAttempt < 2 ? item.thumbnail : null;
  };

  const handleImageError = () => {
    if (thumbnailAttempt < 2) {
      setThumbnailAttempt(prev => prev + 1);
    }
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      // @ts-ignore - TV specific prop
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
          </View>
        )}
        <View style={[styles.categoryBadge, isRTL ? { left: 8 } : { right: 8 }]}>
          <Text style={styles.categoryBadgeText}>{categoryIcon}</Text>
        </View>
        {item.duration && (
          <View style={[styles.durationBadge, isRTL ? { right: 8 } : { left: 8 }]}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { textAlign }]} numberOfLines={2}>
            {getLocalizedText(item, 'title')}
          </Text>
          {item.rabbi && (
            <Text style={[styles.cardRabbi, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'rabbi')}
            </Text>
          )}
          {item.description && (
            <Text style={[styles.cardDescription, { textAlign }]} numberOfLines={1}>
              {getLocalizedText(item, 'description')}
            </Text>
          )}
        </View>
        {isFocused && (
          <View style={styles.overlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
