/**
 * Bayit+ iOS Mobile App
 * Entry point with production error boundary for TestFlight/App Store
 */

import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryConfig';
import { AppContent } from './src/components/AppContent';
import { ProductionErrorBoundary } from './src/components/ProductionErrorBoundary';

function App(): React.JSX.Element {
  return (
    <ProductionErrorBoundary>
      <SafeAreaProvider>
        <View style={styles.container}>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </QueryClientProvider>
        </View>
      </SafeAreaProvider>
    </ProductionErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
});

export default App;
