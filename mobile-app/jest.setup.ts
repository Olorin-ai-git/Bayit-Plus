/**
 * Jest Setup for Bayit+ iOS Mobile App
 *
 * Configures mocks for React Native and third-party libraries
 */

import '@testing-library/react-native/extend-expect';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    ALWAYS: 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
  },
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null),
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Home: 'Home',
  Tv: 'Tv',
  Film: 'Film',
  Radio: 'Radio',
  Mic: 'Mic',
  MicOff: 'MicOff',
  User: 'User',
  Settings: 'Settings',
  ChevronRight: 'ChevronRight',
  ChevronLeft: 'ChevronLeft',
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setExtra: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: (component: any) => component,
}));

// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

// Mock react-native-google-cast
jest.mock('react-native-google-cast', () => ({
  CastButton: 'CastButton',
  useCastSession: jest.fn().mockReturnValue(null),
  useRemoteMediaClient: jest.fn().mockReturnValue(null),
  useCastState: jest.fn().mockReturnValue('noDevicesAvailable'),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock @bayit/shared-hooks
jest.mock('@bayit/shared-hooks', () => ({
  useDirection: () => ({ isRTL: false }),
}));

// Mock @olorin/design-tokens
jest.mock('@olorin/design-tokens', () => ({
  colors: {
    primary: '#a855f7',
    primary600: '#8a2be2',
    textMuted: '#888888',
    text: '#ffffff',
    background: '#0a0a14',
    glassBorder: 'rgba(126, 34, 206, 0.4)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
    },
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  default: {
    scope: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Setup global fetch mock
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  blob: jest.fn().mockResolvedValue(new Blob()),
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
