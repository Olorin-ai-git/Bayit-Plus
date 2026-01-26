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

export interface ContentCardProps {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type?: string;
  focused: boolean;
  hasTVPreferredFocus?: boolean;
  onPress: () => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  id,
  title,
  subtitle,
  thumbnail,
  type,
  focused,
  hasTVPreferredFocus = false,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

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
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholder} />
            </View>
          )}
        </View>

        {/* Content overlay */}
        <View style={styles.contentOverlay}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
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
