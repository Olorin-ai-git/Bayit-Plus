/**
 * React Native Reanimated Web Shim
 *
 * Provides stub exports for react-native-reanimated on web.
 * Web platform uses CSS animations instead of Reanimated.
 */

import { View, Text, ScrollView, Image } from 'react-native';
import Animated from 'react-native-web/dist/exports/Animated';

// Export Animated API from react-native-web
export default {
  View,
  Text,
  ScrollView,
  Image,
  createAnimatedComponent: (component) => component,
  ...Animated,
};

// Named exports
export const createAnimatedComponent = (component) => component;
export const useSharedValue = (initialValue) => ({ value: initialValue });
export const useAnimatedStyle = (cb) => cb();
export const withTiming = (value) => value;
export const withSpring = (value) => value;
export const withDelay = (delay, value) => value;
export const withSequence = (...values) => values[values.length - 1];
export const withRepeat = (value) => value;
export const interpolate = (value, inputRange, outputRange) => outputRange[0];
export const Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const runOnJS = (fn) => fn;
export const useAnimatedGestureHandler = () => ({});
export const useAnimatedReaction = () => {};
export const useDerivedValue = (cb) => ({ value: cb() });
export const cancelAnimation = () => {};
export const Easing = {
  linear: (x) => x,
  ease: (x) => x,
  quad: (x) => x,
  cubic: (x) => x,
  poly: (n) => (x) => x,
  sin: (x) => x,
  circle: (x) => x,
  exp: (x) => x,
  elastic: (bounciness) => (x) => x,
  back: (s) => (x) => x,
  bounce: (x) => x,
  bezier: (x1, y1, x2, y2) => (x) => x,
  in: (easing) => (x) => x,
  out: (easing) => (x) => x,
  inOut: (easing) => (x) => x,
};

// Layout animations (no-ops on web)
export const Layout = {};
export const FadeIn = {};
export const FadeInDown = {};
export const FadeInUp = {};
export const FadeOut = {};
export const SlideInLeft = {};
export const SlideInRight = {};
export const SlideOutLeft = {};
export const SlideOutRight = {};
export const ZoomIn = {};
export const ZoomOut = {};
