import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, {
  G,
  Path,
  Circle,
  Rect,
  Polygon,
  Ellipse,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';

export type MascotMood = 'neutral' | 'happy' | 'thinking' | 'listening' | 'celebrating';
export type MascotAnimation = 'idle' | 'wave' | 'nod' | 'bounce' | 'sparkle';

interface BayitMascotProps {
  size?: number;
  mood?: MascotMood;
  animation?: MascotAnimation;
  style?: any;
}

const AnimatedG = Animated.createAnimatedComponent(G);

export const BayitMascot: React.FC<BayitMascotProps> = ({
  size = 200,
  mood = 'neutral',
  animation = 'idle',
  style,
}) => {
  // Animation values
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // Bounce animation
  useEffect(() => {
    if (animation === 'bounce') {
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      bounce.start();
      return () => bounce.stop();
    } else {
      bounceAnim.setValue(0);
    }
  }, [animation, bounceAnim]);

  // Blink animation
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(blinkAnim, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim]);

  // Wave animation
  useEffect(() => {
    if (animation === 'wave') {
      const wave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: -1,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      );
      wave.start();
      return () => wave.stop();
    } else {
      waveAnim.setValue(0);
    }
  }, [animation, waveAnim]);

  // Glow animation for listening
  useEffect(() => {
    if (mood === 'listening') {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [mood, glowAnim]);

  // Sparkle animation for celebrating
  useEffect(() => {
    if (animation === 'sparkle' || mood === 'celebrating') {
      const sparkle = Animated.loop(
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      sparkle.start();
      return () => sparkle.stop();
    } else {
      sparkleAnim.setValue(0);
    }
  }, [animation, mood, sparkleAnim]);

  // Get eye expression based on mood
  const getEyeExpression = () => {
    switch (mood) {
      case 'happy':
      case 'celebrating':
        return { scaleY: 0.8, offsetY: 2 }; // Squinted happy eyes
      case 'thinking':
        return { scaleY: 1, offsetY: -3 }; // Looking up
      case 'listening':
        return { scaleY: 1.1, offsetY: 0 }; // Attentive
      default:
        return { scaleY: 1, offsetY: 0 };
    }
  };

  // Get mouth expression based on mood
  const getMouthPath = () => {
    switch (mood) {
      case 'happy':
      case 'celebrating':
        // Big smile (door as smile)
        return 'M 85 130 Q 100 155 115 130'; // Smile arc
      case 'thinking':
        // Small O shape
        return 'M 95 135 Q 100 140 105 135 Q 100 145 95 135';
      case 'listening':
        // Slightly open
        return 'M 90 130 L 110 130 Q 100 140 90 130';
      default:
        // Neutral door shape
        return 'M 90 120 L 90 145 L 110 145 L 110 120';
    }
  };

  const eyeExpr = getEyeExpression();
  const mouthPath = getMouthPath();

  const translateY = bounceAnim;
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            {/* Roof gradient */}
            <LinearGradient id="roofGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#00d9ff" />
              <Stop offset="100%" stopColor="#0099cc" />
            </LinearGradient>

            {/* Body gradient */}
            <LinearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#e8e8e8" />
            </LinearGradient>

            {/* Glow gradient for listening */}
            <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00d9ff" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#00d9ff" stopOpacity="0" />
            </RadialGradient>

            {/* Window gradient */}
            <LinearGradient id="windowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#87ceeb" />
              <Stop offset="100%" stopColor="#4a90a4" />
            </LinearGradient>
          </Defs>

          {/* Glow effect when listening */}
          {mood === 'listening' && (
            <Circle
              cx="100"
              cy="120"
              r="90"
              fill="url(#glowGradient)"
              opacity={0.6}
            />
          )}

          {/* House body (main rectangle) */}
          <Rect
            x="50"
            y="80"
            width="100"
            height="100"
            rx="10"
            ry="10"
            fill="url(#bodyGradient)"
            stroke="#ddd"
            strokeWidth="2"
          />

          {/* Roof (triangle) */}
          <Polygon
            points="100,20 160,80 40,80"
            fill="url(#roofGradient)"
            stroke="#0088aa"
            strokeWidth="2"
          />

          {/* Chimney */}
          <Rect
            x="125"
            y="35"
            width="20"
            height="35"
            fill="#ff6b6b"
            stroke="#e55"
            strokeWidth="2"
            rx="3"
          />

          {/* Left eye (window) */}
          <G transform={`translate(0, ${eyeExpr.offsetY}) scale(1, ${eyeExpr.scaleY})`}>
            <Rect
              x="60"
              y="95"
              width="25"
              height="25"
              rx="5"
              fill="url(#windowGradient)"
              stroke="#5a9"
              strokeWidth="2"
            />
            {/* Eye pupil */}
            <Circle
              cx="72"
              cy="107"
              r="5"
              fill="#333"
            />
            {/* Eye shine */}
            <Circle
              cx="75"
              cy="104"
              r="2"
              fill="#fff"
            />
          </G>

          {/* Right eye (window) */}
          <G transform={`translate(0, ${eyeExpr.offsetY}) scale(1, ${eyeExpr.scaleY})`}>
            <Rect
              x="115"
              y="95"
              width="25"
              height="25"
              rx="5"
              fill="url(#windowGradient)"
              stroke="#5a9"
              strokeWidth="2"
            />
            {/* Eye pupil */}
            <Circle
              cx="127"
              cy="107"
              r="5"
              fill="#333"
            />
            {/* Eye shine */}
            <Circle
              cx="130"
              cy="104"
              r="2"
              fill="#fff"
            />
          </G>

          {/* Mouth/Door */}
          {mood === 'happy' || mood === 'celebrating' ? (
            // Smile for happy moods
            <Path
              d={mouthPath}
              fill="none"
              stroke="#333"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : (
            // Door for other moods
            <G>
              <Rect
                x="88"
                y="135"
                width="24"
                height="40"
                rx="3"
                fill="#8B4513"
                stroke="#654321"
                strokeWidth="2"
              />
              {/* Door knob */}
              <Circle
                cx="105"
                cy="155"
                r="3"
                fill="#FFD700"
              />
            </G>
          )}

          {/* Cheeks (blush) for happy mood */}
          {(mood === 'happy' || mood === 'celebrating') && (
            <>
              <Ellipse
                cx="55"
                cy="125"
                rx="8"
                ry="5"
                fill="#ffb6c1"
                opacity={0.6}
              />
              <Ellipse
                cx="145"
                cy="125"
                rx="8"
                ry="5"
                fill="#ffb6c1"
                opacity={0.6}
              />
            </>
          )}

          {/* Sparkles for celebrating */}
          {(animation === 'sparkle' || mood === 'celebrating') && (
            <>
              <G opacity={0.8}>
                <Path
                  d="M 30 50 L 35 60 L 30 70 L 25 60 Z"
                  fill="#FFD700"
                />
                <Path
                  d="M 170 40 L 175 50 L 170 60 L 165 50 Z"
                  fill="#FFD700"
                />
                <Path
                  d="M 20 140 L 25 150 L 20 160 L 15 150 Z"
                  fill="#FFD700"
                />
                <Path
                  d="M 180 130 L 185 140 L 180 150 L 175 140 Z"
                  fill="#FFD700"
                />
              </G>
            </>
          )}

          {/* Sound waves for listening */}
          {mood === 'listening' && (
            <G opacity={0.6}>
              <Path
                d="M 170 90 Q 185 100 170 110"
                fill="none"
                stroke="#00d9ff"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Path
                d="M 180 85 Q 200 100 180 115"
                fill="none"
                stroke="#00d9ff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Path
                d="M 30 90 Q 15 100 30 110"
                fill="none"
                stroke="#00d9ff"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <Path
                d="M 20 85 Q 0 100 20 115"
                fill="none"
                stroke="#00d9ff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </G>
          )}

          {/* Thinking dots for thinking mood */}
          {mood === 'thinking' && (
            <G>
              <Circle cx="160" cy="50" r="5" fill="#aaa" />
              <Circle cx="175" cy="40" r="7" fill="#aaa" />
              <Circle cx="190" cy="25" r="9" fill="#aaa" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BayitMascot;
