/**
 * Bayit+ iOS Mobile App
 * Main app entry point with full provider setup
 *
 * Initializes:
 * - React Navigation (NavigationContainer)
 * - React Query (QueryClientProvider)
 * - Safe Area (SafeAreaProvider)
 * - Internationalization (i18next)
 * - App content with voice support and navigation
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryConfig';
import { AppContent } from './src/components/AppContent';
import { initNativeI18n } from '@olorin/shared-i18n/native';

/**
 * Initialize i18n on app startup
 * This ensures locale and translations are loaded before rendering
 */
let i18nInitialized = false;

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize i18n once on app startup
    if (!i18nInitialized) {
      initNativeI18n().then(() => {
        i18nInitialized = true;
      }).catch((error) => {
        console.error('Failed to initialize i18n:', error);
        // Fall back to default language if initialization fails
        i18nInitialized = true;
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // No longer needed - AppContent handles all styling
});

export default App;
