/**
 * Bayit+ iOS Mobile App
 * Main app entry point with navigation and context providers
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import i18n, { loadSavedLanguage } from '@bayit/shared-i18n';

// Context Providers
import { ProfileProvider } from '@bayit/shared-contexts';
import { ModalProvider } from '@bayit/shared-contexts';

// Navigation
import { linking } from './src/navigation/linking';

// App Content (contains voice hooks and navigation)
import { AppContent } from './src/components/AppContent';

// Splash Screen
import { SplashScreen } from './src/components/SplashScreen';

// Import stores to initialize them
import { useAuthStore } from '@bayit/shared-stores';

// Utilities
import { errorHandler, accessibilityService } from './src/utils';

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Load saved language preference
        await loadSavedLanguage();

        // Initialize error handler (network monitoring)
        errorHandler.initialize();

        // Initialize accessibility service
        await accessibilityService.initialize();

        console.log('[App] Initialization complete');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setIsReady(true); // Still allow app to load
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = useCallback(() => {
    console.log('[App] Splash complete, showing main app');
    setShowSplash(false);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          {showSplash ? (
            <SplashScreen onComplete={handleSplashComplete} minimumDuration={2000} />
          ) : (
            <ModalProvider>
              <ProfileProvider>
                <NavigationContainer linking={linking}>
                  <AppContent />
                </NavigationContainer>
              </ProfileProvider>
            </ModalProvider>
          )}
        </SafeAreaProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

export default App;
