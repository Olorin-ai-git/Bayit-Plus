/**
 * App Content Component
 * Using JS-based stack to avoid react-native-screens Fabric issues
 */

import React, { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import MainTabNavigator from '../navigation/MainTabNavigator';
import { initializeI18n } from '../services/i18n';
import { setupTrackPlayer, playbackService, networkMonitor, rtlService, pushNotificationService } from '../services';
import { useDeepLinking } from '../hooks/useDeepLinking';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { SplashScreen } from './SplashScreen';
import { Colors } from '../theme/colors';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('AppContent');
const Stack = createStackNavigator();

export const AppContent: React.FC = () => {
  const [i18nReady, setI18nReady] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);

  useDeepLinking();
  usePushNotifications();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          initializeI18n(),
          setupTrackPlayer(),
          rtlService.initialize(),
          pushNotificationService.initialize(),
        ]);

        networkMonitor.initialize();

        moduleLogger.info('App infrastructure initialized successfully');
        setI18nReady(true);
      } catch (error) {
        moduleLogger.error('Failed to initialize app infrastructure', { error });
        setI18nReady(true);
      }
    };

    initializeApp();

    return () => {
      networkMonitor.cleanup();
      pushNotificationService.cleanup();
    };
  }, []);

  if (!i18nReady) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <GlassLoadingSpinner size="large" />
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.Background.primary} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
