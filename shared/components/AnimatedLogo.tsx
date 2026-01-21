import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

const logo = require('../assets/images/logos/logo.png');

interface AnimatedLogoProps {
  onAnimationComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
  logoScale?: number; // Custom scale multiplier for logo only
  hideHouse?: boolean; // Hide the house image, show only text
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  onAnimationComplete,
  size = 'large',
  logoScale = 1,
  hideHouse = false,
}) => {
  const { i18n } = useTranslation();
  const { isRTL } = useDirection();
  const isHebrew = i18n.language === 'he';

  // Animation values - direction based on language
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const bayitTranslateX = useRef(new Animated.Value(isRTL ? 150 : -150)).current;
  const plusTranslateX = useRef(new Animated.Value(isRTL ? -150 : 150)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const sizes = {
    small: { logo: 40, logoHeight: 20, text: 20, plus: 18 },
    medium: { logo: 90, logoHeight: 45, text: 48, plus: 42 },
    large: { logo: 120, logoHeight: 60, text: 64, plus: 56 },
  };

  const isSmall = size === 'small';

  const currentSize = sizes[size];

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Text slides in from both sides and meets in middle
      Animated.parallel([
        // Show text
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        // "בית" slides from right to center
        Animated.spring(bayitTranslateX, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        // "+" slides from left to center
        Animated.spring(plusTranslateX, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // 2. Delay before logo appears
      Animated.delay(400),

      // 3. Logo fades in slowly
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete callback
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    });
  }, []);

  return (
    <View className={`items-center justify-center ${isSmall ? 'flex-row gap-2' : ''}`}>
      {/* Animated Logo Image - appears after text */}
      {!hideHouse && (
        <Animated.View
          className={isSmall ? 'mb-0' : '-mb-2'}
          style={{ opacity: logoOpacity }}
        >
          <Image
            source={logo}
            style={{ width: currentSize.logo * logoScale, height: currentSize.logoHeight * logoScale }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Animated Text - order changes based on language */}
      <View className="flex-row items-center justify-center">
        {isHebrew ? (
          <>
            {/* Hebrew: בית+ */}
            <Animated.Text
              className="font-bold text-white"
              style={{
                fontSize: currentSize.text,
                opacity: textOpacity,
                transform: [{ translateX: bayitTranslateX }],
              }}
            >
              בית
            </Animated.Text>
            <Animated.Text
              className="font-bold text-purple-500 ml-1"
              style={{
                fontSize: currentSize.plus,
                opacity: textOpacity,
                transform: [{ translateX: plusTranslateX }],
              }}
            >
              +
            </Animated.Text>
          </>
        ) : (
          <>
            {/* English/Spanish: Bayit+ */}
            <Animated.Text
              className="font-bold text-white"
              style={{
                fontSize: currentSize.text,
                opacity: textOpacity,
                transform: [{ translateX: bayitTranslateX }],
              }}
            >
              Bayit
            </Animated.Text>
            <Animated.Text
              className="font-bold text-purple-500 ml-1"
              style={{
                fontSize: currentSize.plus,
                opacity: textOpacity,
                transform: [{ translateX: plusTranslateX }],
              }}
            >
              +
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  );
};

export default AnimatedLogo;
