/**
 * AI Search Screen - tvOS Beta
 * TODO: Implement AI-powered search functionality
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AISearchScreenProps {
  isEnrolled: boolean;
  onBack: () => void;
}

export const AISearchScreen: React.FC<AISearchScreenProps> = ({ isEnrolled, onBack }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Search</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
      <Text style={styles.description}>
        AI-powered search feature is currently in development.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#A855F7',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 32,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
  },
  description: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
