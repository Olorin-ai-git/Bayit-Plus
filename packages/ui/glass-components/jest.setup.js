// Jest setup for React Native testing (CommonJS format for ts-jest)

// Mock React Native core
global.Platform = {
  OS: 'web',
  select: (obj) => obj[global.Platform.OS] ?? obj.default,
  isTV: false,
};

// Mock Animated
global.Animated = {
  Value: jest.fn().mockImplementation(() => ({
    setValue: jest.fn(),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    stopAnimation: jest.fn(),
    interpolate: jest.fn(),
  })),
  timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  add: jest.fn().mockImplementation(() => ({ interpolate: jest.fn() })),
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  SpringAnimationConfig: {},
};

// Mock react-native
jest.mock('react-native', () => {
  const React = require('react');

  // Component wrapper to map React Native props to their DOM equivalents.
  const createComponent = (name) => {
    return React.forwardRef((props, ref) => {
      const {
        testID,
        onPress,
        accessibilityLabel,
        accessibilityHint,
        accessibilityRole,
        accessibilityState,
        accessibilityValue,
        accessible: _accessible,
        onChangeText,
        onHoverIn,
        onHoverOut,
        onPressIn,
        onPressOut,
        style,
        ...rest
      } = props;
      const normalizeStyle = (value) => {
        if (typeof value === 'function') return normalizeStyle(value({ pressed: false }));
        if (Array.isArray(value)) return Object.assign({}, ...value.filter(Boolean).map(normalizeStyle));
        return value || undefined;
      };
      const elementProps = {
        ...rest,
        ...(style ? { style: normalizeStyle(style) } : {}),
        ...(testID ? { 'data-testid': testID } : {}),
        ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
        ...(accessibilityHint ? { 'aria-description': accessibilityHint } : {}),
        ...(accessibilityRole ? { role: accessibilityRole } : {}),
        ...(accessibilityState?.disabled !== undefined
          ? { 'aria-disabled': accessibilityState.disabled }
          : {}),
        ...(accessibilityState?.checked !== undefined
          ? { 'aria-checked': accessibilityState.checked }
          : {}),
        ...(accessibilityValue?.min !== undefined ? { 'aria-valuemin': accessibilityValue.min } : {}),
        ...(accessibilityValue?.max !== undefined ? { 'aria-valuemax': accessibilityValue.max } : {}),
        ...(accessibilityValue?.now !== undefined ? { 'aria-valuenow': accessibilityValue.now } : {}),
      };

      // Map onPress to onClick for web testing
      if (onPress) {
        elementProps.onClick = onPress;
      }
      if (onChangeText) {
        elementProps.onChange = (event) => onChangeText(event.target.value);
      }
      if (onHoverIn) elementProps.onMouseEnter = onHoverIn;
      if (onHoverOut) elementProps.onMouseLeave = onHoverOut;
      if (onPressIn) elementProps.onMouseDown = onPressIn;
      if (onPressOut) elementProps.onMouseUp = onPressOut;

      const tagName = name === 'TextInput' ? 'input' : name.toLowerCase();
      return React.createElement(tagName, { ...elementProps, ref });
    });
  };

  const FlatList = React.forwardRef(({ data = [], renderItem, keyExtractor, ...props }, ref) => (
    React.createElement(
      'flatlist',
      { ...props, ref },
      data.map((item, index) => React.createElement(
        React.Fragment,
        { key: keyExtractor ? keyExtractor(item, index) : index },
        renderItem({ item, index })
      ))
    )
  ));

  return {
    Platform: global.Platform,
    Animated: global.Animated,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (styles) => Object.assign({}, ...[].concat(styles).filter(Boolean)),
    },
    View: createComponent('View'),
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    TouchableWithoutFeedback: createComponent('TouchableWithoutFeedback'),
    Pressable: createComponent('Pressable'),
    ActivityIndicator: createComponent('ActivityIndicator'),
    Image: createComponent('Image'),
    ScrollView: createComponent('ScrollView'),
    TextInput: createComponent('TextInput'),
    Modal: createComponent('Modal'),
    FlatList,
    PanResponder: {
      create: jest.fn().mockImplementation((handlers) => ({ panHandlers: handlers })),
    },
    Easing: {
      ease: jest.fn(),
      inOut: jest.fn().mockImplementation((easing) => easing),
    },
    useWindowDimensions: () => ({ width: global.__mockWindowWidth ?? 1024, height: 768, scale: 1, fontScale: 1 }),
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
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
  __esModule: true,
  default: { View: 'view' },
  useSharedValue: jest.fn().mockImplementation((initialValue) => ({ value: initialValue })),
  useAnimatedStyle: jest.fn().mockImplementation((callback) => callback()),
  withSpring: jest.fn().mockImplementation((value) => value),
  withTiming: jest.fn().mockImplementation((value, _config, callback) => {
    callback?.(true);
    return value;
  }),
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
  useSafeAreaInsets: () => global.__mockSafeAreaInsets || { top: 0, bottom: 0, left: 0, right: 0 },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockSvgComponent = (name) => {
    return React.forwardRef((props, ref) => {
      const { onPress, ...rest } = props;
      return React.createElement(name.toLowerCase(), { ...rest, ...(onPress ? { onClick: onPress } : {}), ref });
    });
  };

  return {
    __esModule: true,
    default: mockSvgComponent('Svg'),
    Svg: mockSvgComponent('Svg'),
    Circle: mockSvgComponent('Circle'),
    Ellipse: mockSvgComponent('Ellipse'),
    G: mockSvgComponent('G'),
    Text: mockSvgComponent('Text'),
    TSpan: mockSvgComponent('TSpan'),
    TextPath: mockSvgComponent('TextPath'),
    Path: mockSvgComponent('Path'),
    Polygon: mockSvgComponent('Polygon'),
    Polyline: mockSvgComponent('Polyline'),
    Line: mockSvgComponent('Line'),
    Rect: mockSvgComponent('Rect'),
    Use: mockSvgComponent('Use'),
    Image: mockSvgComponent('Image'),
    Symbol: mockSvgComponent('Symbol'),
    Defs: mockSvgComponent('Defs'),
    LinearGradient: mockSvgComponent('LinearGradient'),
    RadialGradient: mockSvgComponent('RadialGradient'),
    Stop: mockSvgComponent('Stop'),
    ClipPath: mockSvgComponent('ClipPath'),
    Pattern: mockSvgComponent('Pattern'),
    Mask: mockSvgComponent('Mask'),
  };
});
