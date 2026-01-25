// Jest setup for React Native testing (CommonJS format for ts-jest)

// Mock React Native core
global.Platform = {
  OS: 'web',
  select: (obj) => obj.web || obj.default,
  isTV: false,
};

// Mock Animated
global.Animated = {
  Value: jest.fn().mockImplementation(() => ({
    setValue: jest.fn(),
    interpolate: jest.fn(),
  })),
  timing: jest.fn().mockReturnValue({ start: jest.fn() }),
  spring: jest.fn().mockReturnValue({ start: jest.fn() }),
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  SpringAnimationConfig: {},
};

// Mock react-native
jest.mock('react-native', () => ({
  Platform: global.Platform,
  Animated: global.Animated,
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
  I18nManager: {
    isRTL: false,
  },
  Vibration: {
    vibrate: jest.fn(),
  },
}));

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn().mockImplementation((initialValue) => ({ value: initialValue })),
  useAnimatedStyle: jest.fn().mockImplementation((callback) => callback()),
  withSpring: jest.fn().mockImplementation((value) => value),
  withTiming: jest.fn().mockImplementation((value) => value),
  runOnJS: jest.fn().mockImplementation((callback) => callback),
  Easing: { bezier: jest.fn() },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: 'View',
  Gesture: {
    Pan: () => ({
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
