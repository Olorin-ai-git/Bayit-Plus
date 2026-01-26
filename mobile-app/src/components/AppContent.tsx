/**
 * App Content Component
 * Simplified version focusing on 6 main screens
 */

import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from '../navigation/MainTabNavigator';

const Stack = createNativeStackNavigator();

export const AppContent: React.FC = () => {
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
});
