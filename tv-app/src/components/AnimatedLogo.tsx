import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';

const logo = require('../assets/logo.png');

interface AnimatedLogoProps {
  onAnimationComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  onAnimationComplete,
  size = 'large',
}) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const bayitTranslateX = useRef(new Animated.Value(150)).current; // Start from right
  const plusTranslateX = useRef(new Animated.Value(-150)).current; // Start from left
  const textOpacity = useRef(new Animated.Value(0)).current;

  const sizes = {
    small: { logo: 60, logoHeight: 30, text: 32, plus: 28 },
    medium: { logo: 90, logoHeight: 45, text: 48, plus: 42 },
    large: { logo: 120, logoHeight: 60, text: 64, plus: 56 },
  };

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
    <View style={styles.container}>
      {/* Animated Logo Image - appears after text */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={logo}
          style={[styles.logo, { width: currentSize.logo, height: currentSize.logoHeight }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Text */}
      <View style={styles.textContainer}>
        {/* בית - slides from right */}
        <Animated.Text
          style={[
            styles.bayitText,
            {
              fontSize: currentSize.text,
              opacity: textOpacity,
              transform: [{ translateX: bayitTranslateX }],
            },
          ]}
        >
          בית
        </Animated.Text>

        {/* + - slides from left */}
        <Animated.Text
          style={[
            styles.plusText,
            {
              fontSize: currentSize.plus,
              opacity: textOpacity,
              transform: [{ translateX: plusTranslateX }],
            },
          ]}
        >
          +
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: -8,
  },
  logo: {
    // Size set dynamically
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bayitText: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  plusText: {
    fontWeight: 'bold',
    color: '#00d9ff',
    marginLeft: 4,
  },
});

export default AnimatedLogo;
