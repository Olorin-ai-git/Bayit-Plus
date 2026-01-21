import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

/**
 * Test providers wrapper that includes all necessary providers
 * for testing shared components.
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer>{children}</NavigationContainer>
    </I18nextProvider>
  );
}

/**
 * Custom render function that wraps components with providers
 * @param ui - Component to render
 * @param options - Render options
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from @testing-library/react-native
export * from '@testing-library/react-native';
