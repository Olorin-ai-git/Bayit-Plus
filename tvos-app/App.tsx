/**
 * Bayit+ tvOS App - Minimal Version for Testing
 * Simplified app without navigation dependencies to test bundled JavaScript
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bayit+ TV</Text>
        <Text style={styles.subtitle}>tvOS Application Test</Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>✓ JavaScript Bundle Loaded</Text>
          <Text style={styles.statusText}>✓ React Native Initialized</Text>
          <Text style={styles.statusText}>✓ App Rendering Successfully</Text>
        </View>
        <Text style={styles.version}>Version 0.0.1 • React Native tvOS 0.83.1-0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 36,
    color: '#CCCCCC',
    marginBottom: 60,
  },
  statusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 40,
    marginBottom: 40,
  },
  statusText: {
    fontSize: 28,
    color: '#4ADE80',
    marginBottom: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 24,
    color: '#666666',
  },
});
