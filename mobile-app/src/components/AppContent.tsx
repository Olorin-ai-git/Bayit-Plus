/**
 * App Content Component
 * Using JS-based stack to avoid react-native-screens Fabric issues
 */

import React, { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from '../navigation/MainTabNavigator';
import { initializeI18n } from '../services/i18n';
import { SplashScreen } from './SplashScreen';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('AppContent');
const Stack = createStackNavigator();

export const AppContent: React.FC = () => {
  const [i18nReady, setI18nReady] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    initializeI18n()
      .then(() => {
        setI18nReady(true);
      })
      .catch((error) => {
        moduleLogger.error('Failed to initialize i18n', { error });
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#7e22ce" />
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
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />
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
    backgroundColor: '#0d0d1a',
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
