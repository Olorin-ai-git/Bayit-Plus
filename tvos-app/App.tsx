/**
 * Bayit+ tvOS App
 *
 * Root component wiring i18n, React Query, and React Navigation.
 * All screens live in src/screens/ and src/components/beta/.
 * Navigation is handled by src/navigation/AppNavigator.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';
import { AppNavigator } from './src/navigation';
import { initializeI18n } from './src/services/i18n';
import { logger } from './src/utils/logger';
import { colors } from '@olorin/design-tokens';
import { SplashScreen } from './src/components/SplashScreen';

const tvDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary['500'],
    background: colors.dark['950'],
    card: colors.dark['950'],
    text: '#ffffff',
    border: 'rgba(168, 85, 247, 0.2)',
    notification: colors.primary['500'],
  },
};

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    initializeI18n()
      .then(() => setI18nReady(true))
      .catch((error) => {
        logger.error('Failed to initialize i18n', { error });
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary['500']} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!splashComplete) {
    return (
      <SplashScreen onComplete={() => setSplashComplete(true)} />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer theme={tvDarkTheme}>
        <AppNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.dark['950'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
