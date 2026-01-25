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
jest.mock('react-native', () => {
  const React = require('react');

  // Component wrapper to map testID to data-testid and onPress to onClick
  const createComponent = (name) => {
    return React.forwardRef((props, ref) => {
      const { testID, onPress, ...rest } = props;
      const elementProps = testID ? { ...rest, 'data-testid': testID } : rest;

      // Map onPress to onClick for web testing
      if (onPress) {
        elementProps.onClick = onPress;
      }

      return React.createElement(name.toLowerCase(), { ...elementProps, ref });
    });
  };

  return {
    Platform: global.Platform,
    Animated: global.Animated,
    StyleSheet: {
      create: (styles) => styles,
    },
    View: createComponent('View'),
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    Pressable: createComponent('Pressable'),
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
    },
    I18nManager: {
      isRTL: false,
    },
    Vibration: {
      vibrate: jest.fn(),
    },
  };
});

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
