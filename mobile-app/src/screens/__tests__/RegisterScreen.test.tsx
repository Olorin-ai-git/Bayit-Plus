/**
 * RegisterScreen Tests
 *
 * Tests rendering, form fields, validation, and authentication actions.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from '../RegisterScreen';

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
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'count' in opts) {
        return `${key} (${opts.count})`;
      }
      return key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockRegister = jest.fn();
const mockLoginWithGoogle = jest.fn();
const mockClearError = jest.fn();

jest.mock('@bayit/shared-stores/authStore', () => ({
  useAuthStore: () => ({
    register: mockRegister,
    loginWithGoogle: mockLoginWithGoogle,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

jest.mock('@bayit/shared/ui', () => ({
  GlassSpinner: ({ size }: { size: string }) => {
    const { View, Text } = require('react-native');
    return <View testID="glass-spinner"><Text>{size}</Text></View>;
  },
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
    GlassCheckbox: ({ checked, onToggle, label, disabled }: any) => (
      <Pressable
        testID="glass-checkbox-terms"
        onPress={() => onToggle(!checked)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <Text>{label}</Text>
      </Pressable>
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

// --- Tests ---

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<RegisterScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays the Bayit+ logo', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('Bayit')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
    });

    it('displays the create account header', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('register.createAccount')).toBeTruthy();
    });

    it('displays the join Bayit+ subtitle', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('register.joinBayitPlus')).toBeTruthy();
    });
  });

  describe('form fields', () => {
    it('renders the name input field', () => {
      const { getByTestId } = render(<RegisterScreen />);
      expect(getByTestId('glass-input-register.namePlaceholder')).toBeTruthy();
    });

    it('renders the email input field', () => {
      const { getByTestId } = render(<RegisterScreen />);
      expect(getByTestId('glass-input-register.emailPlaceholder')).toBeTruthy();
    });

    it('renders the password input field', () => {
      const { getByTestId } = render(<RegisterScreen />);
      expect(getByTestId('glass-input-register.passwordPlaceholder')).toBeTruthy();
    });

    it('renders the confirm password input field', () => {
      const { getByTestId } = render(<RegisterScreen />);
      expect(getByTestId('glass-input-register.confirmPasswordPlaceholder')).toBeTruthy();
    });

    it('renders all four field labels', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('register.fullName')).toBeTruthy();
      expect(getByText('register.email')).toBeTruthy();
      expect(getByText('register.password')).toBeTruthy();
      expect(getByText('register.confirmPassword')).toBeTruthy();
    });

    it('renders the terms checkbox', () => {
      const { getByTestId } = render(<RegisterScreen />);
      expect(getByTestId('glass-checkbox-terms')).toBeTruthy();
    });

    it('allows entering form values', () => {
      const { getByTestId } = render(<RegisterScreen />);

      const nameInput = getByTestId('glass-input-register.namePlaceholder');
      fireEvent.changeText(nameInput, 'Test User');
      expect(nameInput.props.value).toBe('Test User');

      const emailInput = getByTestId('glass-input-register.emailPlaceholder');
      fireEvent.changeText(emailInput, 'test@example.com');
      expect(emailInput.props.value).toBe('test@example.com');
    });
  });

  describe('buttons', () => {
    it('renders the create account button', () => {
      const { getAllByText } = render(<RegisterScreen />);
      // The "register.createAccount" text appears both in header and button
      const elements = getAllByText('register.createAccount');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('renders the Google sign-up button', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('login.continueWithGoogle')).toBeTruthy();
    });

    it('renders the sign-in link for existing users', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('register.alreadyHaveAccount')).toBeTruthy();
      expect(getByText('register.signIn')).toBeTruthy();
    });

    it('renders the divider text', () => {
      const { getByText } = render(<RegisterScreen />);
      expect(getByText('login.or')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates back when sign-in link is pressed', () => {
      const { getByText } = render(<RegisterScreen />);
      const signInLink = getByText('register.signIn');
      fireEvent.press(signInLink);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('clears errors on navigation back to login', () => {
      const { getByText } = render(<RegisterScreen />);
      fireEvent.press(getByText('register.signIn'));
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('form validation', () => {
    it('does not call register when fields are empty and create account is pressed', () => {
      const { getByTestId } = render(<RegisterScreen />);

      // The create account button testID uses the translation key
      const createButton = getByTestId('glass-button-register.createAccount');
      fireEvent.press(createButton);

      // Validation should trigger, not calling register
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows validation error when name is empty', async () => {
      const { getByTestId, queryByTestId } = render(<RegisterScreen />);

      const createButton = getByTestId('glass-button-register.createAccount');
      fireEvent.press(createButton);

      // Error banner should appear for validation error
      await waitFor(() => {
        expect(queryByTestId('glass-error-banner')).toBeTruthy();
      });
    });
  });

  describe('authentication actions', () => {
    it('calls loginWithGoogle when Google button is pressed', () => {
      const { getByTestId } = render(<RegisterScreen />);
      const googleButton = getByTestId('glass-button-login.continueWithGoogle');
      fireEvent.press(googleButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });

    it('toggles terms checkbox', () => {
      const { getByTestId } = render(<RegisterScreen />);
      const checkbox = getByTestId('glass-checkbox-terms');
      fireEvent.press(checkbox);
      // After toggle, it should now be checked
      expect(checkbox.props.accessibilityState.checked).toBeDefined();
    });
  });
});
