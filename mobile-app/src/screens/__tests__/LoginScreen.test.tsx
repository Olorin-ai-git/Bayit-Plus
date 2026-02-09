/**
 * LoginScreen Tests
 *
 * Tests rendering, form fields, authentication buttons, and navigation.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { LoginScreen } from '../LoginScreen';

// --- Mocks ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();
const mockClearError = jest.fn();

jest.mock('@bayit/shared-stores/authStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    isLoading: false,
    error: null,
    clearError: mockClearError,
    token: null,
    refreshToken: null,
    getState: () => ({ token: null, refreshToken: null }),
  }),
}));

jest.mock('@bayit/shared/ui', () => ({
  GlassLoadingSpinner: ({ size }: { size: string }) => {
    const { View, Text } = require('react-native');
    return <View testID="glass-spinner"><Text>{size}</Text></View>;
  },
}));

jest.mock('@olorin/glass-ui/native', () => {
  const { View, Text, TextInput, Pressable } = require('react-native');
  return {
    GlassButton: ({ children, onPress, disabled, ...props }: any) => (
      <Pressable
        testID={`glass-button-${typeof children === 'string' ? children : 'action'}`}
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassInput: ({ placeholder, value, onChangeText, ...props }: any) => (
      <TextInput
        testID={`glass-input-${placeholder || 'field'}`}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    ),
    GlassCard: ({ children, style }: any) => (
      <View testID="glass-card">{children}</View>
    ),
    GlassErrorBanner: ({ message, onDismiss }: any) => (
      <View testID="glass-error-banner">
        <Text>{message}</Text>
        <Pressable testID="dismiss-error" onPress={onDismiss} />
      </View>
    ),
    colors: {
      background: '#0d0d1a',
      text: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.7)',
      textMuted: 'rgba(255,255,255,0.5)',
      primary: '#7e22ce',
      glassBorder: 'rgba(126,34,206,0.25)',
      glassBorderLight: 'rgba(126,34,206,0.15)',
    },
    spacing: {
      xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
    },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    scope: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }),
  },
}));

jest.mock('../../services/secureStorageService', () => ({
  secureStorageService: {
    getBiometricType: jest.fn().mockResolvedValue(null),
    storeOAuthCredentials: jest.fn().mockResolvedValue(undefined),
    getOAuthCredentials: jest.fn().mockResolvedValue(null),
    getValidAccessToken: jest.fn().mockResolvedValue(null),
  },
}));

// --- Tests ---

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<LoginScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays the Bayit+ logo text', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('Bayit')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
    });

    it('displays the welcome back header', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.welcomeBack')).toBeTruthy();
    });

    it('displays the sign-in subtitle', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.signInToContinue')).toBeTruthy();
    });

    it('displays the terms agreement text', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.termsAgreement')).toBeTruthy();
    });
  });

  describe('form fields', () => {
    it('renders the email input field', () => {
      const { getByTestId } = render(<LoginScreen />);
      const emailInput = getByTestId('glass-input-login.emailPlaceholder');
      expect(emailInput).toBeTruthy();
    });

    it('renders the password input field', () => {
      const { getByTestId } = render(<LoginScreen />);
      const passwordInput = getByTestId('glass-input-login.passwordPlaceholder');
      expect(passwordInput).toBeTruthy();
    });

    it('renders the email label', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.email')).toBeTruthy();
    });

    it('renders the password label', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.password')).toBeTruthy();
    });

    it('allows entering email text', () => {
      const { getByTestId } = render(<LoginScreen />);
      const emailInput = getByTestId('glass-input-login.emailPlaceholder');
      fireEvent.changeText(emailInput, 'user@example.com');
      expect(emailInput.props.value).toBe('user@example.com');
    });

    it('allows entering password text', () => {
      const { getByTestId } = render(<LoginScreen />);
      const passwordInput = getByTestId('glass-input-login.passwordPlaceholder');
      fireEvent.changeText(passwordInput, 'secret123');
      expect(passwordInput.props.value).toBe('secret123');
    });
  });

  describe('buttons', () => {
    it('renders the sign-in button', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.signIn')).toBeTruthy();
    });

    it('renders the Google sign-in button', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.continueWithGoogle')).toBeTruthy();
    });

    it('renders the forgot password link', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.forgotPassword')).toBeTruthy();
    });

    it('renders the sign-up link', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.signUp')).toBeTruthy();
    });

    it('renders the divider text', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('login.or')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to Register when sign-up link is pressed', () => {
      const { getByText } = render(<LoginScreen />);
      const signUpLink = getByText('login.signUp');
      fireEvent.press(signUpLink);
      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });

    it('navigates to ForgotPassword when forgot password is pressed', () => {
      const { getByText } = render(<LoginScreen />);
      const forgotLink = getByText('login.forgotPassword');
      fireEvent.press(forgotLink);
      expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
    });

    it('clears error on navigation to Register', () => {
      const { getByText } = render(<LoginScreen />);
      fireEvent.press(getByText('login.signUp'));
      expect(mockClearError).toHaveBeenCalled();
    });

    it('clears error on navigation to ForgotPassword', () => {
      const { getByText } = render(<LoginScreen />);
      fireEvent.press(getByText('login.forgotPassword'));
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('authentication actions', () => {
    it('calls login when sign-in button is pressed with valid fields', () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      const emailInput = getByTestId('glass-input-login.emailPlaceholder');
      const passwordInput = getByTestId('glass-input-login.passwordPlaceholder');

      fireEvent.changeText(emailInput, 'user@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByTestId('glass-button-login.signIn');
      fireEvent.press(signInButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    it('calls loginWithGoogle when Google button is pressed', () => {
      const { getByTestId } = render(<LoginScreen />);
      const googleButton = getByTestId('glass-button-login.continueWithGoogle');
      fireEvent.press(googleButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });
  });
});
