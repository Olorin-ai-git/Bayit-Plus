import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { colors } from '@olorin/design-tokens';

// Platform-specific logo import
let logo: any;
try {
  // Try ES6 import for web
  if (Platform.OS === 'web') {
    logo = require('../assets/images/logos/logo.png').default || require('../assets/images/logos/logo.png');
  } else {
    logo = require('../assets/images/logos/logo.png');
  }
} catch (e) {
  console.warn('Logo image could not be loaded:', e);
  logo = null;
}

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
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      {/* Animated Logo Image - appears after text */}
      {!hideHouse && logo && (
        <Animated.View
          style={[
            isSmall ? styles.logoMarginSmall : styles.logoMargin,
            { opacity: logoOpacity }
          ]}
        >
          <Image
            source={logo}
            style={{ width: currentSize.logo * logoScale, height: currentSize.logoHeight * logoScale }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Animated Text - order changes based on language */}
      <View style={styles.textContainer}>
        {isHebrew ? (
          <>
            {/* Hebrew: בית+ */}
            <Animated.Text
              style={[
                styles.textBase,
                styles.textWhite,
                {
                  fontSize: currentSize.text,
                  opacity: textOpacity,
                  transform: [{ translateX: bayitTranslateX }],
                }
              ]}
            >
              בית
            </Animated.Text>
            <Animated.Text
              style={[
                styles.textBase,
                styles.textPurple,
                styles.plusSpacing,
                {
                  fontSize: currentSize.plus,
                  opacity: textOpacity,
                  transform: [{ translateX: plusTranslateX }],
                }
              ]}
            >
              +
            </Animated.Text>
          </>
        ) : (
          <>
            {/* English/Spanish: Bayit+ */}
            <Animated.Text
              style={[
                styles.textBase,
                styles.textWhite,
                {
                  fontSize: currentSize.text,
                  opacity: textOpacity,
                  transform: [{ translateX: bayitTranslateX }],
                }
              ]}
            >
              Bayit
            </Animated.Text>
            <Animated.Text
              style={[
                styles.textBase,
                styles.textPurple,
                styles.plusSpacing,
                {
                  fontSize: currentSize.plus,
                  opacity: textOpacity,
                  transform: [{ translateX: plusTranslateX }],
                }
              ]}
            >
              +
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSmall: {
    flexDirection: 'row',
    gap: 8,
  },
  logoMargin: {
    marginBottom: -8,
  },
  logoMarginSmall: {
    marginBottom: 0,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    fontWeight: '700',
  },
  textWhite: {
    color: colors.text, // Use theme color for text
  },
  textPurple: {
    color: colors.primary.DEFAULT, // Use theme color for primary
  },
  plusSpacing: {
    marginLeft: 4,
  },
});

export default AnimatedLogo;
