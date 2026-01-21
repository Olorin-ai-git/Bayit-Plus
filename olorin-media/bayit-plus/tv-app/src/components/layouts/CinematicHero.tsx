import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  trailer_url?: string;
  duration?: number;
  category?: string;
  year?: number;
  rating?: string;
}

interface CinematicHeroProps {
  items: ContentItem[];
  onItemSelect?: (item: ContentItem) => void;
  onItemPlay?: (item: ContentItem) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
}

/**
 * CinematicHero Layout
 * Large auto-playing backdrop with parallax scrolling for TV.
 * D-pad optimized with cinematic focus states.
 */
export const CinematicHero: React.FC<CinematicHeroProps> = ({
  items,
  onItemSelect,
  onItemPlay,
  autoRotate = true,
  rotateInterval = 8000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focusedButton, setFocusedButton] = useState<string>('play');
  const [showTrailer, setShowTrailer] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  const currentItem = items[currentIndex];

  // Auto-rotate through items
  useEffect(() => {
    if (!autoRotate || items.length <= 1) return;

    const interval = setInterval(() => {
      animateTransition(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      });
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, items.length, rotateInterval]);

  // Animate transition between items
  const animateTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(50),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // Handle item navigation
  const goToItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length || index === currentIndex) return;
    animateTransition(() => setCurrentIndex(index));
  }, [items.length, currentIndex, animateTransition]);

  const goToNext = useCallback(() => {
    goToItem((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, goToItem]);

  const goToPrevious = useCallback(() => {
    goToItem((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, goToItem]);

  // Parallax effect on focus change
  useEffect(() => {
    Animated.spring(parallaxAnim, {
      toValue: focusedButton === 'play' ? 0 : focusedButton === 'more' ? -20 : 20,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [focusedButton, parallaxAnim]);

  // Handle button focus for TV navigation
  const handlePlay = () => {
    if (currentItem) {
      onItemPlay?.(currentItem);
    }
  };

  const handleMoreInfo = () => {
    if (currentItem) {
      onItemSelect?.(currentItem);
    }
  };

  const toggleTrailer = () => {
    setShowTrailer((prev) => !prev);
  };

  if (!items.length) {
    return (
      <View className="relative" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}>
        <Text className="text-gray-400 text-lg text-center" style={{ marginTop: SCREEN_HEIGHT * 0.3 }}>אין תוכן להצגה</Text>
      </View>
    );
  }

  return (
    <View className="relative" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}>
      {/* Background Image with Parallax */}
      <Animated.View
        className="absolute inset-0"
        style={{
          transform: [
            { translateX: parallaxAnim },
            { scale: 1.1 },
          ],
        }}
      >
        {showTrailer && currentItem?.trailer_url ? (
          <Video
            source={{ uri: currentItem.trailer_url }}
            className="w-full h-full"
            resizeMode="cover"
            repeat
            muted={false}
          />
        ) : (
          <Image
            source={{ uri: currentItem?.backdrop || currentItem?.thumbnail }}
            className="w-full h-full"
            resizeMode="cover"
          />
        )}
      </Animated.View>

      {/* Gradient Overlays */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
        className="absolute left-0 right-0 bottom-0"
        style={{ height: '70%' }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="absolute left-0 top-0 bottom-0"
        style={{ width: '50%' }}
      />

      {/* Content */}
      <Animated.View
        className="absolute"
        style={[
          { left: isTV ? 80 : 48, bottom: isTV ? 80 : 48, maxWidth: isTV ? 700 : 500 },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Category Badge */}
        {currentItem?.category && (
          <GlassView className="self-start px-4 py-1 rounded-full mb-4" intensity="light">
            <Text className="text-sm text-white font-medium">{currentItem.category}</Text>
          </GlassView>
        )}

        {/* Title */}
        <Text className="font-bold text-white mb-2" style={{ fontSize: isTV ? 56 : 42, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 }}>{currentItem?.title}</Text>

        {/* Metadata */}
        <View className="flex-row items-center gap-4 mb-4">
          {currentItem?.year && (
            <Text className="text-base text-gray-400">{currentItem.year}</Text>
          )}
          {currentItem?.rating && (
            <View className="bg-white/20 px-2 py-0.5 rounded-sm">
              <Text className="text-sm text-white font-semibold">{currentItem.rating}</Text>
            </View>
          )}
          {currentItem?.duration && (
            <Text className="text-base text-gray-400">
              {Math.floor(currentItem.duration / 60)} דקות
            </Text>
          )}
        </View>

        {/* Description */}
        {currentItem?.description && (
          <Text className="text-white/80 mb-6" style={{ fontSize: isTV ? 20 : 16, lineHeight: isTV ? 30 : 24 }} numberOfLines={3}>
            {currentItem.description}
          </Text>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            className={`flex-row items-center gap-2 bg-purple-500 rounded-lg ${focusedButton === 'play' ? 'border-[3px] border-white scale-105' : ''}`}
            style={{ paddingHorizontal: isTV ? 32 : 24, paddingVertical: isTV ? 16 : 12 }}
            onPress={handlePlay}
            onFocus={() => setFocusedButton('play')}
          >
            <Text className="text-white" style={{ fontSize: isTV ? 20 : 16 }}>▶</Text>
            <Text className="font-semibold text-white" style={{ fontSize: isTV ? 20 : 16 }}>צפה עכשיו</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center gap-2 bg-white/20 rounded-lg ${focusedButton === 'more' ? 'border-[3px] border-white scale-105' : ''}`}
            style={{ paddingHorizontal: isTV ? 24 : 20, paddingVertical: isTV ? 16 : 12 }}
            onPress={handleMoreInfo}
            onFocus={() => setFocusedButton('more')}
          >
            <Text className="text-white" style={{ fontSize: isTV ? 18 : 14 }}>ℹ</Text>
            <Text className="font-medium text-white" style={{ fontSize: isTV ? 18 : 14 }}>מידע נוסף</Text>
          </TouchableOpacity>

          {currentItem?.trailer_url && (
            <TouchableOpacity
              className={`flex-row items-center gap-2 bg-white/20 rounded-lg ${focusedButton === 'trailer' ? 'border-[3px] border-white scale-105' : ''}`}
              style={{ paddingHorizontal: isTV ? 24 : 20, paddingVertical: isTV ? 16 : 12 }}
              onPress={toggleTrailer}
              onFocus={() => setFocusedButton('trailer')}
            >
              <Text style={{ fontSize: isTV ? 18 : 14 }}>🎬</Text>
              <Text className="font-medium text-white" style={{ fontSize: isTV ? 18 : 14 }}>
                {showTrailer ? 'סגור טריילר' : 'צפה בטריילר'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Navigation Indicators */}
      <View className="absolute flex-row gap-2" style={{ bottom: isTV ? 30 : 20, right: isTV ? 80 : 48 }}>
        {items.map((_, index) => (
          <TouchableOpacity
            key={index}
            className={`h-1 rounded-sm ${index === currentIndex ? 'bg-purple-500' : focusedButton === `indicator-${index}` ? 'bg-white' : 'bg-white/30'}`}
            style={{ width: isTV ? 40 : 30 }}
            onPress={() => goToItem(index)}
            onFocus={() => setFocusedButton(`indicator-${index}`)}
          />
        ))}
      </View>

      {/* Navigation Arrows (visible on focus) */}
      <View className="absolute left-0 right-0 flex-row justify-between px-4" style={{ top: '50%' }}>
        <TouchableOpacity
          className={`rounded-full bg-black/50 justify-center items-center ${focusedButton === 'prev' ? 'opacity-100 bg-white/30 border-2 border-white' : 'opacity-50'}`}
          style={{ width: isTV ? 60 : 48, height: isTV ? 60 : 48 }}
          onPress={goToPrevious}
          onFocus={() => setFocusedButton('prev')}
        >
          <Text className="text-white font-light" style={{ fontSize: isTV ? 36 : 28 }}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`rounded-full bg-black/50 justify-center items-center ${focusedButton === 'next' ? 'opacity-100 bg-white/30 border-2 border-white' : 'opacity-50'}`}
          style={{ width: isTV ? 60 : 48, height: isTV ? 60 : 48 }}
          onPress={goToNext}
          onFocus={() => setFocusedButton('next')}
        >
          <Text className="text-white font-light" style={{ fontSize: isTV ? 36 : 28 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Item Counter */}
      <View className="absolute" style={{ top: isTV ? 30 : 20, right: isTV ? 80 : 48 }}>
        <Text className="text-sm text-white/50">
          {currentIndex + 1} / {items.length}
        </Text>
      </View>
    </View>
  );
};

export default CinematicHero;
